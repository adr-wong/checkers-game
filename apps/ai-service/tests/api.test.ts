import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { ENGLISH, INTERNATIONAL } from "@checkers/shared";
import type { RuleSet } from "@checkers/shared";
import app from "../src/index";

// ─── Board String Constants ─────────────────────────────────────────────────

/**
 * Standard 8x8 opening position.
 * Red: rows 0-2 on dark squares. Black: rows 5-7 on dark squares.
 * // r at row0:cols1,3,5,7  row1:cols0,2,4,6  row2:cols1,3,5,7
 * // b at row5:cols0,2,4,6  row6:cols1,3,5,7  row7:cols0,2,4,6
 */
const OPENING_8X8 =
  "-r-r-r-r" + // row 0: r at cols 1,3,5,7
  "r-r-r-r-" + // row 1: r at cols 0,2,4,6
  "-r-r-r-r" + // row 2: r at cols 1,3,5,7
  "--------" + // row 3: empty
  "--------" + // row 4: empty
  "b-b-b-b-" + // row 5: b at cols 0,2,4,6
  "-b-b-b-b" + // row 6: b at cols 1,3,5,7
  "b-b-b-b-"; // row 7: b at cols 0,2,4,6

/**
 * Single capture position.
 * // r at [2,3] index=19  b at [3,4] index=28  # at [4,5] index=37
 * // All other dark squares empty. Light squares are '-'.
 */
const SINGLE_CAPTURE =
  "--------" + // row 0
  "--------" + // row 1
  "---r----" + // row 2: r at [2,3]
  "----b---" + // row 3: b at [3,4]
  "-----#--" + // row 4: empty dark at [4,5]
  "--------" + // row 5
  "--------" + // row 6
  "--------"; // row 7

/**
 * Multi-jump position.
 * // r at [2,1] index=17
 * // b at [3,2] index=26  b at [5,4] index=44
 * // empty dark at [4,3] index=35  [6,5] index=53
 */
const MULTI_JUMP =
  "--------" + // row 0
  "--------" + // row 1
  "-r------" + // row 2: r at [2,1]
  "--b-----" + // row 3: b at [3,2]
  "---#----" + // row 4: empty dark at [4,3]
  "----b---" + // row 5: b at [5,4]
  "-----#--" + // row 6: empty dark at [6,5]
  "--------"; // row 7

/**
 * Promotion position.
 * // r at [5,2] index=42  b at [6,3] index=51  # at [7,4] index=60
 */
const PROMOTION =
  "--------" + // row 0
  "--------" + // row 1
  "--------" + // row 2
  "--------" + // row 3
  "--------" + // row 4
  "--r-----" + // row 5: r at [5,2]
  "---b----" + // row 6: b at [6,3]
  "----#---"; // row 7: empty dark at [7,4] (promotion square for red)

/**
 * Simplified mid-game position (4 pieces per side).
 * Used in hard-difficulty tests where the full opening board is too slow at depth 9.
 * Red at rows 3-4, Black at rows 5-6.
 * // r at [3,0] [3,4] [4,1] [4,5]
 * // b at [5,2] [5,6] [6,1] [6,5]
 */
const MID_GAME =
  "--------" + // row 0
  "--------" + // row 1
  "--------" + // row 2
  "r---r---" + // row 3: r at [3,0] and [3,4]
  "-r---r--" + // row 4: r at [4,1] and [4,5]
  "--b---b-" + // row 5: b at [5,2] and [5,6]
  "-b---b--" + // row 6: b at [6,1] and [6,5]
  "--------"; // row 7

/**
 * No moves for red.
 * Only black pieces remain. Red has no pieces.
 * // b at [0,1] index=1 (dark square, row 0 col 1)
 */
const NO_MOVES_FOR_RED =
  "-b------" + // row 0: b at [0,1]
  "--------" + // row 1
  "--------" + // row 2
  "--------" + // row 3
  "--------" + // row 4
  "--------" + // row 5
  "--------" + // row 6
  "--------"; // row 7

// ─── RuleSet Constants ──────────────────────────────────────────────────────

const ENGLISH_RULESET = {
  name: "English Draughts",
  boardSize: 8,
  normalMoveDirections: "forward",
  kingMoveDistance: "single",
  captureRequired: true,
  captureMaximum: false,
  captureBackward: false,
  promotionEndsJump: true,
  startingLayout: "standard",
};

// ─── Helper ─────────────────────────────────────────────────────────────────

async function postMove(body: object): Promise<Response> {
  return app.fetch(
    new Request("http://localhost/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("GET /health", () => {
  // Tests that the health endpoint is always available and returns
  // the expected shape regardless of engine state.

  it("returns 200 with status ok", async () => {
    const res = await app.fetch(new Request("http://localhost/health"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it('returns service name "ai-service"', async () => {
    const res = await app.fetch(new Request("http://localhost/health"));
    const body = await res.json();
    expect(body.service).toBe("ai-service");
  });
});

describe("POST /move — validation", () => {
  // Tests that the validation layer rejects malformed requests before
  // they reach the engine. Each test targets one specific field.

  it("rejects missing team", async () => {
    const res = await postMove({
      difficulty: "easy",
      algorithm: "minimax",
      board: OPENING_8X8,
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("team must be 'red' or 'black'");
  });

  it("rejects invalid team value", async () => {
    const res = await postMove({
      team: "green",
      difficulty: "easy",
      algorithm: "minimax",
      board: OPENING_8X8,
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("team must be 'red' or 'black'");
  });

  it("rejects missing difficulty", async () => {
    const res = await postMove({
      team: "red",
      algorithm: "minimax",
      board: OPENING_8X8,
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("difficulty must be 'easy', 'medium', or 'hard'");
  });

  it("rejects invalid difficulty value", async () => {
    const res = await postMove({
      team: "red",
      difficulty: "extreme",
      algorithm: "minimax",
      board: OPENING_8X8,
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("difficulty must be 'easy', 'medium', or 'hard'");
  });

  it("rejects missing algorithm", async () => {
    const res = await postMove({
      team: "red",
      difficulty: "easy",
      board: OPENING_8X8,
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("algorithm must be 'minimax' or 'astar'");
  });

  it("rejects invalid algorithm value", async () => {
    const res = await postMove({
      team: "red",
      difficulty: "easy",
      algorithm: "greedy",
      board: OPENING_8X8,
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("algorithm must be 'minimax' or 'astar'");
  });

  it("rejects missing board", async () => {
    const res = await postMove({
      team: "red",
      difficulty: "easy",
      algorithm: "minimax",
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("board is required");
  });

  it("rejects board with wrong length", async () => {
    const res = await postMove({
      team: "red",
      difficulty: "easy",
      algorithm: "minimax",
      board: "--------",
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("board length must be 64 for an 8x8 board");
  });

  it("rejects board with invalid characters", async () => {
    const board = OPENING_8X8.slice(0, 23) + "X" + OPENING_8X8.slice(24);
    const res = await postMove({
      team: "red",
      difficulty: "easy",
      algorithm: "minimax",
      board,
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("board contains invalid character 'X' at index 23");
  });

  it("rejects missing ruleset", async () => {
    const res = await postMove({
      team: "red",
      difficulty: "easy",
      algorithm: "minimax",
      board: OPENING_8X8,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("ruleset is required");
  });

  it("rejects ruleset that fails validateRuleSet", async () => {
    const badRuleset = {
      ...ENGLISH_RULESET,
      captureMaximum: true,
      captureRequired: false,
    };
    const res = await postMove({
      team: "red",
      difficulty: "easy",
      algorithm: "minimax",
      board: OPENING_8X8,
      ruleset: badRuleset,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid ruleset");
  });

  it("returns 422 when team has no legal moves", async () => {
    const res = await postMove({
      team: "red",
      difficulty: "easy",
      algorithm: "minimax",
      board: NO_MOVES_FOR_RED,
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("No legal moves available for team red");
  });
});

describe("POST /move — minimax algorithm", () => {
  // Tests that the minimax engine returns valid, legal moves.
  // Does not assert WHICH move is chosen — only that the response
  // is structurally correct and the move is legal.

  it("returns a valid move for the opening position", async () => {
    const res = await postMove({
      team: "red",
      difficulty: "easy",
      algorithm: "minimax",
      board: OPENING_8X8,
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.from).toHaveLength(2);
    expect(body.to).toHaveLength(2);
    expect(body.resulting_board).toHaveLength(64);
    expect(body.resulting_board).not.toBe(OPENING_8X8);
    expect(body.algorithm).toBe("minimax");
    expect(Array.isArray(body.captures)).toBe(true);
    expect(typeof body.promotion).toBe("boolean");
  });

  it("returns the only legal capture in a forced-capture position", async () => {
    const res = await postMove({
      team: "red",
      difficulty: "hard",
      algorithm: "minimax",
      board: SINGLE_CAPTURE,
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.from).toEqual([2, 3]);
    expect(body.to).toEqual([4, 5]);
    expect(body.captures).toEqual([[3, 4]]);
  });

  it("returns a multi-jump move as a single move object", async () => {
    const res = await postMove({
      team: "red",
      difficulty: "hard",
      algorithm: "minimax",
      board: MULTI_JUMP,
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.captures.length).toBe(2);
  });

  it("returns a promotion move with promotion: true", async () => {
    const res = await postMove({
      team: "red",
      difficulty: "hard",
      algorithm: "minimax",
      board: PROMOTION,
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.promotion).toBe(true);
    expect(body.resulting_board[60]).toBe("R");
  });

  it("easy difficulty returns a move (not necessarily optimal)", async () => {
    const res = await postMove({
      team: "red",
      difficulty: "easy",
      algorithm: "minimax",
      board: OPENING_8X8,
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.from).toHaveLength(2);
    expect(body.to).toHaveLength(2);
    expect(body.resulting_board).toHaveLength(64);
  });

  it("hard difficulty is deterministic (same input = same output)", async () => {
    const res1 = await postMove({
      team: "red",
      difficulty: "hard",
      algorithm: "minimax",
      board: MID_GAME,
      ruleset: ENGLISH_RULESET,
    });
    const res2 = await postMove({
      team: "red",
      difficulty: "hard",
      algorithm: "minimax",
      board: MID_GAME,
      ruleset: ENGLISH_RULESET,
    });
    const body1 = await res1.json();
    const body2 = await res2.json();
    expect(body1.from).toEqual(body2.from);
    expect(body1.to).toEqual(body2.to);
    expect(body1.captures).toEqual(body2.captures);
  });

  it("easy difficulty may differ between calls (noise active)", async () => {
    // This test has a theoretical false-failure rate near zero but
    // is not perfectly deterministic. Math.random() could produce
    // the same noise value 10 times in a row, but the probability
    // is (1/161)^10 ≈ 0, effectively impossible.
    const results = [];
    for (let i = 0; i < 10; i++) {
      const res = await postMove({
        team: "red",
        difficulty: "easy",
        algorithm: "minimax",
        board: OPENING_8X8,
        ruleset: ENGLISH_RULESET,
      });
      const body = await res.json();
      results.push(`${body.from[0]},${body.from[1]}-${body.to[0]},${body.to[1]}`);
    }
    const allSame = results.every((r) => r === results[0]);
    expect(allSame).toBe(false);
  });
});

describe("POST /move — astar algorithm", () => {
  // Tests that the A* engine returns structurally valid moves.
  // A* plays weaker than minimax but must still return legal moves.

  it("returns a valid move for the opening position", async () => {
    const res = await postMove({
      team: "red",
      difficulty: "hard",
      algorithm: "astar",
      board: OPENING_8X8,
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.from).toHaveLength(2);
    expect(body.to).toHaveLength(2);
    expect(body.resulting_board).toHaveLength(64);
    expect(body.resulting_board).not.toBe(OPENING_8X8);
    expect(body.algorithm).toBe("astar");
    expect(Array.isArray(body.captures)).toBe(true);
    expect(typeof body.promotion).toBe("boolean");
  });

  it("returns the forced capture in a single-capture position", async () => {
    const res = await postMove({
      team: "red",
      difficulty: "hard",
      algorithm: "astar",
      board: SINGLE_CAPTURE,
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.captures).toEqual([[3, 4]]);
  });

  it("returns a structurally valid response for all difficulties", async () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const res = await postMove({
        team: "red",
        difficulty,
        algorithm: "astar",
        board: MID_GAME,
        ruleset: ENGLISH_RULESET,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.from).toHaveLength(2);
      expect(body.to).toHaveLength(2);
      expect(body.resulting_board).toHaveLength(64);
    }
  });
});

describe("POST /move — ruleset variation", () => {
  // Tests that different rulesets produce different legal move sets,
  // confirming the engine reads rules from the ruleset object.

  it("INTERNATIONAL ruleset allows backward capture where ENGLISH does not", async () => {
    // 10x10 board: red normal at [6,3] (dark), black at [5,4] (dark), empty at [4,5] (dark).
    // Capture backward: [6,3] -> [4,5] capturing [5,4]
    // With INTERNATIONAL (captureBackward: true): allowed
    // With ENGLISH (captureBackward: false): no backward capture
    const board =
      "----------" + // row 0
      "----------" + // row 1
      "----------" + // row 2
      "----------" + // row 3
      "-----#----" + // row 4: empty dark at [4,5]
      "----b-----" + // row 5: b at [5,4]
      "---r------" + // row 6: r at [6,3]
      "----------" + // row 7
      "----------" + // row 8
      "----------"; // row 9

    // With INTERNATIONAL: backward capture allowed
    const resInternational = await postMove({
      team: "red",
      difficulty: "hard",
      algorithm: "minimax",
      board,
      ruleset: INTERNATIONAL,
    });
    expect(resInternational.status).toBe(200);
    const bodyInternational = await resInternational.json();
    expect(bodyInternational.captures).toEqual([[5, 4]]);

    // With ENGLISH on a blocked 8x8 board: no captures, forward squares blocked → 422
    const boardEnglish =
      "--------" + // row 0
      "--------" + // row 1
      "--------" + // row 2
      "--------" + // row 3
      "--------" + // row 4
      "---r----" + // row 5: r at [5,3]
      "--b-b---" + // row 6: b at [6,2] and [6,4] (blocks forward)
      "--------"; // row 7

    const resEnglishBlocked = await postMove({
      team: "red",
      difficulty: "hard",
      algorithm: "minimax",
      board: boardEnglish,
      ruleset: ENGLISH_RULESET,
    });
    expect(resEnglishBlocked.status).toBe(422);
  });

  it("INTERNATIONAL ruleset uses maximum capture filter", async () => {
    // 10x10 board layout:
    // Red at [6,3] and [4,7] (dark). Black at [5,2], [3,2], [3,8] (dark).
    // Empty landing: [4,1], [2,3], [2,9] (dark).
    // Sequence A (2 captures): [6,3] -> [4,1] capturing [5,2], then [4,1] -> [2,3] capturing [3,2]
    // Sequence B (1 capture): [4,7] -> [2,9] capturing [3,8]
    // With captureMaximum: must choose the 2-capture sequence.
    const intlBoard =
      "----------" + // row 0
      "----------" + // row 1
      "---#-----#" + // row 2: [2,3] empty dark, [2,9] empty dark
      "--b---b---" + // row 3: [3,2] black, [3,8] black
      "-#-#-#-r-#" + // row 4: [4,7] red
      "#-b-#-#-#-" + // row 5: [5,2] black
      "-#-r-#-#-#" + // row 6: [6,3] red
      "----------" + // row 7
      "----------" + // row 8
      "----------"; // row 9

    const res = await postMove({
      team: "red",
      difficulty: "hard",
      algorithm: "minimax",
      board: intlBoard,
      ruleset: INTERNATIONAL,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.captures.length).toBe(2);
  });
});

describe("POST /move — response shape", () => {
  // Tests that every field in the success response is present and
  // correctly typed regardless of algorithm or difficulty.

  it("success response contains all required fields", async () => {
    const res = await postMove({
      team: "red",
      difficulty: "hard",
      algorithm: "minimax",
      board: MID_GAME,
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.from).toBeDefined();
    expect(body.to).toBeDefined();
    expect(body.captures).toBeDefined();
    expect(body.promotion).toBeDefined();
    expect(body.algorithm).toBeDefined();
    expect(body.resulting_board).toBeDefined();
    expect(body.from).toHaveLength(2);
    expect(body.to).toHaveLength(2);
    expect(Array.isArray(body.captures)).toBe(true);
    expect(typeof body.promotion).toBe("boolean");
    expect(body.resulting_board).toHaveLength(64);
  });

  it("resulting_board reflects the move that was made", async () => {
    const res = await postMove({
      team: "red",
      difficulty: "hard",
      algorithm: "minimax",
      board: SINGLE_CAPTURE,
      ruleset: ENGLISH_RULESET,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    // The move must be [2,3] -> [4,5] capturing [3,4]
    expect(body.from).toEqual([2, 3]);
    expect(body.to).toEqual([4, 5]);
    // Origin cell should be empty
    expect(body.resulting_board[19]).not.toBe("r");
    // Captured cell should be empty
    expect(body.resulting_board[28]).not.toBe("b");
    // Destination should have the piece
    expect(body.resulting_board[37]).toBe("r");
  });
});
