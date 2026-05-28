/**
 * index.ts — Hono server for the AI microservice.
 *
 * Stateless service: every request is fully self-contained.
 * Same input → same output when eval noise is zero.
 * No database. No session. No shared mutable state between requests.
 *
 * Endpoints:
 *   GET  /health  — returns service status for container orchestration
 *   POST /move    — accepts a board state and returns the AI's chosen move
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Cell, Team, Move, RuleSet } from "@checkers/shared";
import {
  parseBoardString,
  serializeBoardString,
  getLegalMoves,
  applyMove,
  validateRuleSet,
} from "@checkers/shared";
import type { Difficulty } from "./types";
import { minimaxSearch } from "./engine/search";
import { astarSearch } from "./engine/astar";

// ─── Environment Configuration ──────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "4000", 10);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

// ─── Request Timeout ────────────────────────────────────────────────────────

const ENGINE_TIMEOUT_MS = 9000;

/**
 * Races the engine call against a timeout.
 * Returns the move on success, or throws on timeout.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Engine timeout")), ms);
  });
  try {
    const result = await Promise.race([promise, timeout]);
    clearTimeout(timeoutId!);
    return result;
  } catch (err) {
    clearTimeout(timeoutId!);
    throw err;
  }
}

// ─── Validation ─────────────────────────────────────────────────────────────

interface MoveRequest {
  team: string;
  difficulty: string;
  algorithm: string;
  board: string;
  ruleset: RuleSet;
}

/**
 * Validates the request body fields in order.
 * Returns the first error encountered, or null if valid.
 */
function validateRequest(body: Record<string, unknown>): string | null {
  // team validation
  if (typeof body.team !== "string") {
    return "team must be 'red' or 'black'";
  }
  if (body.team !== "red" && body.team !== "black") {
    return "team must be 'red' or 'black'";
  }

  // difficulty validation
  if (typeof body.difficulty !== "string") {
    return "difficulty must be 'easy', 'medium', or 'hard'";
  }
  if (body.difficulty !== "easy" && body.difficulty !== "medium" && body.difficulty !== "hard") {
    return "difficulty must be 'easy', 'medium', or 'hard'";
  }

  // algorithm validation
  if (typeof body.algorithm !== "string") {
    return "algorithm must be 'minimax' or 'astar'";
  }
  if (body.algorithm !== "minimax" && body.algorithm !== "astar") {
    return "algorithm must be 'minimax' or 'astar'";
  }

  // board validation
  if (typeof body.board !== "string") {
    return "board is required";
  }

  // ruleset validation
  if (typeof body.ruleset !== "object" || body.ruleset === null) {
    return "ruleset is required";
  }

  const ruleset = body.ruleset as RuleSet;

  // Board length check (after we know boardSize from ruleset)
  const expectedLength = ruleset.boardSize ** 2;
  if (body.board.length !== expectedLength) {
    return `board length must be ${expectedLength} for an ${ruleset.boardSize}x${ruleset.boardSize} board`;
  }

  // Board character validation
  for (let i = 0; i < body.board.length; i++) {
    const char = body.board[i];
    if (char !== "#" && char !== "-" && char !== "r" && char !== "R" && char !== "b" && char !== "B") {
      return `board contains invalid character '${char}' at index ${i}`;
    }
  }

  // Ruleset validation
  const rulesetErrors = validateRuleSet(ruleset);
  if (rulesetErrors.length > 0) {
    return `Invalid ruleset: ${rulesetErrors[0]}`;
  }

  return null;
}

// ─── Hono App ───────────────────────────────────────────────────────────────

const app = new Hono();

// CORS middleware restricting to ALLOWED_ORIGIN
app.use("*", cors({ origin: ALLOWED_ORIGIN }));

// Global error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal engine error" }, 500);
});

// ─── GET /health ────────────────────────────────────────────────────────────

app.get("/health", (c) => {
  return c.json({ status: "ok", service: "ai-service" });
});

// ─── POST /move ─────────────────────────────────────────────────────────────

app.post("/move", async (c) => {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await c.req.json<Record<string, unknown>>();

    // Validate fields in order
    const error = validateRequest(body);
    if (error) {
      return c.json({ error }, 400);
    }

    // Cast to typed request
    const team = body.team as Team;
    const difficulty = body.difficulty as Difficulty;
    const algorithm = body.algorithm as "minimax" | "astar";
    const boardString = body.board as string;
    const ruleset = body.ruleset as RuleSet;

    // Parse board
    const board = parseBoardString(boardString, ruleset);

    // Check for legal moves
    const legalMoves = getLegalMoves(board, ruleset, team);
    if (legalMoves.length === 0) {
      return c.json({ error: `No legal moves available for team ${team}` }, 422);
    }

    // Run engine with timeout
    let move: Move;
    try {
      if (algorithm === "minimax") {
        move = await withTimeout(
          Promise.resolve(minimaxSearch(board, ruleset, team, difficulty)),
          ENGINE_TIMEOUT_MS
        );
      } else {
        move = await withTimeout(
          Promise.resolve(astarSearch(board, ruleset, team, difficulty)),
          ENGINE_TIMEOUT_MS
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message === "Engine timeout") {
        console.warn(`Engine timeout: board=${boardString}, ruleset=${ruleset.name}`);
        return c.json({ error: "Engine timeout" }, 503);
      }
      throw err;
    }

    // Apply move to get resulting board
    const resultingBoard = applyMove(board, move, ruleset);
    const resultingBoardString = serializeBoardString(resultingBoard, ruleset);

    // Log request
    const duration = Date.now() - startTime;
    console.log(`POST /move 200 ${duration}ms`);

    return c.json({
      from: move.from,
      to: move.to,
      captures: move.captures,
      promotion: move.promotion,
      algorithm,
      resulting_board: resultingBoardString,
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`POST /move 500 ${duration}ms`, err);
    return c.json({ error: "Internal engine error" }, 500);
  }
});

// ─── Server Startup ─────────────────────────────────────────────────────────

export default {
  port: PORT,
  fetch: app.fetch,
};

console.log(`AI service starting on port ${PORT}`);
