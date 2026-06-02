/**
 * astar.ts — A* single-agent search for the best move.
 *
 * Problem framing:
 *   Start state   : the current board
 *   Goal state    : opponent has zero pieces remaining
 *   State         : a Cell[][] board
 *   Action        : a legal Move for the AI team
 *   Step cost     : 1 per move (uniform cost)
 *   Heuristic h   : estimated moves to goal = opponent piece count
 *                   (admissible: capturing one piece per turn is the best
 *                   possible rate, so this never overestimates)
 *   f(n)          : g(n) + h(n) where g = moves taken so far
 *
 * Why this is weaker than minimax for checkers:
 *   A* treats the game as a single-agent pathfinding problem. It models
 *   only the AI's moves and treats the opponent as a static part of the
 *   environment. In reality, checkers is an adversarial game where the
 *   opponent actively tries to block, capture, and outmaneuver. A* cannot
 *   account for opponent responses, so it will miss threats, walk into
 *   traps, and fail to exploit opponent weaknesses.
 *
 * Practical value for a learning project:
 *   Despite being weaker, A* demonstrates core AI concepts: admissible
 *   heuristics, priority queues, state-space search, and goal-directed
 *   reasoning. It provides a concrete contrast with minimax, showing how
 *   adversarial search (modeling the opponent) leads to stronger play.
 *   This comparison is valuable for understanding why game AI uses
 *   minimax-style algorithms rather than pure pathfinding.
 */

import type { Cell, Team, Move, RuleSet } from "@checkers/shared";
import { getLegalMoves, applyMove } from "@checkers/shared";
import type { Difficulty } from "../types";
import { evaluate } from "./eval";

/** Maximum depth for A* search regardless of difficulty. */
const MAX_DEPTH = 8;

/** Safety limit to prevent infinite loops in state-space exploration. */
const MAX_ITERATIONS = 50000;

// ─── Priority Queue (Binary Min-Heap) ───────────────────────────────────────

interface AStarNode {
  board: Cell[][];
  g: number; // cost from start
  h: number; // heuristic: opponent piece count
  f: number; // g + h
  firstMove: Move | null; // the first move from the start state
  path: Move[]; // full path for goal reconstruction
}

/**
 * A minimal binary min-heap for A* node ordering.
 * Ordered by node.f ascending (lowest f = highest priority).
 * Private to this module — not exported.
 */
class MinHeap {
  private data: AStarNode[] = [];

  get size(): number {
    return this.data.length;
  }

  push(node: AStarNode): void {
    this.data.push(node);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): AStarNode | undefined {
    if (this.data.length === 0) return undefined;
    const min = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.sinkDown(0);
    }
    return min;
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.data[parent].f <= this.data[idx].f) break;
      [this.data[parent], this.data[idx]] = [this.data[idx], this.data[parent]];
      idx = parent;
    }
  }

  private sinkDown(idx: number): void {
    const length = this.data.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < length && this.data[left].f < this.data[smallest].f) {
        smallest = left;
      }
      if (right < length && this.data[right].f < this.data[smallest].f) {
        smallest = right;
      }
      if (smallest === idx) break;
      [this.data[smallest], this.data[idx]] = [this.data[idx], this.data[smallest]];
      idx = smallest;
    }
  }
}

// ─── Heuristic ──────────────────────────────────────────────────────────────

/**
 * Counts opponent pieces on the board.
 * This is an admissible heuristic because capturing one piece per turn
 * is the best possible rate, so this never overestimates the moves to goal.
 */
function countOpponentPieces(board: Cell[][], team: Team): number {
  const opponent = team === "red" ? "black" : "red";
  const size = board.length;
  let count = 0;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (board[row][col].piece?.team === opponent) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Serializes a board to a string for state deduplication.
 * Uses a simple string representation for Set membership checks.
 */
function boardToKey(board: Cell[][]): string {
  let key = "";
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const piece = board[row][col].piece;
      if (!piece) {
        key += ".";
      } else {
        key += piece.team === "red"
          ? (piece.type === "king" ? "R" : "r")
          : (piece.type === "king" ? "B" : "b");
      }
    }
  }
  return key;
}

// ─── A* Search ──────────────────────────────────────────────────────────────

/**
 * A* single-agent search for the best move.
 *
 * Treats checkers as a pathfinding problem toward the goal of
 * eliminating all opponent pieces. The opponent is static — this
 * search does not model opponent responses.
 *
 * Heuristic: h(n) = number of opponent pieces remaining (admissible).
 * Cost: g(n) = number of moves taken from start state.
 *
 * Depth limit: 8. At the limit, evaluate() scores the position.
 *
 * Educational note: this implementation will play weaker than minimax
 * because it ignores the opponent's ability to respond. It is included
 * to demonstrate the A* algorithm in a game domain and to provide a
 * contrast with adversarial search.
 *
 * Returns the first move in the best path found.
 * Throws if no legal moves exist (caller must check first).
 */
export function astarSearch(
  board: Cell[][],
  ruleset: RuleSet,
  team: Team,
  _difficulty: Difficulty
): Move {
  const legalMoves = getLegalMoves(board, ruleset, team);

  if (legalMoves.length === 0) {
    throw new Error("No legal moves available");
  }

  // Quick check: if opponent has no pieces, we're already at the goal
  if (countOpponentPieces(board, team) === 0) {
    return legalMoves[0];
  }

  const visited = new Set<string>();
  const openSet = new MinHeap();

  // Initialize with the starting board
  const h0 = countOpponentPieces(board, team);
  openSet.push({
    board,
    g: 0,
    h: h0,
    f: h0,
    firstMove: null,
    path: [],
  });

  let bestScore = -Infinity;
  let bestMove = legalMoves[0];
  let iterations = 0;

  while (openSet.size > 0) {
    iterations++;
    if (iterations > MAX_ITERATIONS) {
      console.warn("A* safety limit reached. Returning best evaluated move.");
      return bestMove;
    }

    const current = openSet.pop()!;

    // State deduplication
    const key = boardToKey(current.board);
    if (visited.has(key)) continue;
    visited.add(key);

    // Check if goal reached (opponent has no pieces)
    if (current.h === 0) {
      return current.firstMove ?? legalMoves[0];
    }

    // Track best evaluated state (including start node)
    if (current.firstMove !== null) {
      const currentScore = evaluate(current.board, team, ruleset);
      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestMove = current.firstMove;
      }
    }

    // Depth limit reached: stop expanding
    if (current.g >= MAX_DEPTH) {
      continue;
    }

    // Expand: generate moves for the AI team
    const moves = getLegalMoves(current.board, ruleset, team);

    for (const move of moves) {
      const newBoard = applyMove(current.board, move, ruleset);
      const newKey = boardToKey(newBoard);

      // Skip early if we already evaluated this layout
      if (visited.has(newKey)) continue;

      const newG = current.g + 1;
      const newH = countOpponentPieces(newBoard, team);
      const newF = newG + newH;

      // Track the first move from the start state
      const firstMove = current.firstMove ?? move;

      openSet.push({
        board: newBoard,
        g: newG,
        h: newH,
        f: newF,
        firstMove,
        path: [...current.path, move],
      });
    }
  }

  return bestMove;
}
