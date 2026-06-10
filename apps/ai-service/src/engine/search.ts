/**
 * search.ts — Negamax search with alpha-beta pruning and iterative deepening.
 *
 * Negamax formulation:
 * In a zero-sum game, the value of a position from one player's perspective
 * is the negative of the value from the opponent's perspective. This means
 * we only need a single recursive function that returns a score from the
 * current player's point of view. At each level, the score is negated
 * before passing to the child node.
 *
 * Alpha-beta pruning:
 * Alpha tracks the best score the maximizing player can guarantee along
 * the path so far. Beta tracks the best score the minimizing player can
 * guarantee. If alpha >= beta, the remaining children cannot improve the
 * result and are pruned (skipped entirely). This can reduce the effective
 * branching factor from b to roughly b^(1/2) in the best case.
 *
 * Iterative deepening:
 * The search runs depth 1 first, then depth 2, and so on up to maxDepth.
 * At each depth completion, the best move found is stored. If the search
 * is cancelled (e.g., by timeout), the best move from the deepest
 * completed iteration is returned. This gives us a anytime algorithm
 * that always has a result ready, even if interrupted.
 *
 * Move ordering is applied at each node to maximize alpha-beta pruning.
 * Higher-quality moves are explored first, causing more cutoffs.
 * This is the practical application of A*-style search guidance
 * within an adversarial minimax framework.
 */

import type { Cell, Team, Move, RuleSet } from "@checkers/shared";
import { getLegalMoves, applyMove, tt, hashBoard } from "@checkers/shared";
import type { Difficulty } from "../types";
import { evaluate } from "./eval";
import { applyNoise } from "./noise";

/** Max search depths by difficulty. */
const MAX_DEPTH: Record<Difficulty, number> = {
  easy: 2,
  medium: 5,
  hard: 9,
};

/**
 * Public entry point for the minimax search.
 *
 * Runs iterative deepening negamax from depth 1 to difficulty.maxDepth.
 * Applies move ordering at each node to maximize alpha-beta pruning.
 * Applies eval noise at leaf nodes via applyNoise().
 *
 * Returns the best Move found within the depth limit.
 * Throws only if the board has no legal moves (caller must check first).
 */
export function minimaxSearch(
  board: Cell[][],
  ruleset: RuleSet,
  team: Team,
  difficulty: Difficulty
): Move {
  const maxDepth = MAX_DEPTH[difficulty];
  const legalMoves = getLegalMoves(board, ruleset, team);

  if (legalMoves.length === 0) {
    throw new Error("No legal moves available");
  }

  let bestMove = legalMoves[0];

  // Iterative deepening: search from depth 1 to maxDepth
  for (let depth = 1; depth <= maxDepth; depth++) {
    let bestScore = -Infinity;
    let currentBestMove = legalMoves[0];

    // Order moves before evaluating at root level
    const orderedMoves = orderMoves(board, legalMoves, ruleset, team);

    for (const move of orderedMoves) {
      const newBoard = applyMove(board, move, ruleset);
      const opponent = team === "red" ? "black" : "red";
      const score = -negamax(newBoard, ruleset, opponent, depth - 1, -Infinity, Infinity, difficulty);

      if (score > bestScore) {
        bestScore = score;
        currentBestMove = move;
      }
    }

    bestMove = currentBestMove;
  }

  return bestMove;
}

function negamax(
  board: Cell[][],
  ruleset: RuleSet,
  team: Team,
  depth: number,
  alpha: number,
  beta: number,
  difficulty: Difficulty
): number {
  const hash = hashBoard(board, team);
  const cached = tt.get(hash, depth);
  if (cached) {
    if (cached.bound === 0) return cached.score;           // exact
    if (cached.bound === 1 && cached.score >= beta) return cached.score;  // lower bound → cutoff
    if (cached.bound === 2 && cached.score <= alpha) return cached.score; // upper bound → prune
  }

  const legalMoves = getLegalMoves(board, ruleset, team);
  if (legalMoves.length === 0) return -10000;

  if (depth === 0) {
    const score = applyNoise(evaluate(board, team, ruleset), difficulty);
    tt.set({ hash, score, depth: 1, bound: 0 });
    return score;
  }

  const orderedMoves = orderMoves(board, legalMoves, ruleset, team);
  const opponent = team === "red" ? "black" : "red";
  let bestMove: Move | undefined;
  const origAlpha = alpha;

  for (const move of orderedMoves) {
    const newBoard = applyMove(board, move, ruleset);
    const score = -negamax(newBoard, ruleset, opponent, depth - 1, -beta, -alpha, difficulty);

    if (score > alpha) { alpha = score; bestMove = move; }
    if (alpha >= beta) {
      tt.set({ hash, score: beta, depth, bound: 1, bestMove });
      return beta;
    }
  }

  tt.set({ hash, score: alpha, depth, bound: alpha > origAlpha ? 0 : 2, bestMove });
  return alpha;
}

/**
 * Move ordering: heuristic-guided sorting to maximize alpha-beta pruning.
 * Higher-quality moves are explored first, causing more cutoffs.
 * This is the practical application of A*-style search guidance
 * within an adversarial minimax framework.
 *
 * Ordering priority (highest to lowest):
 * 1. Captures (any capture before any non-capture)
 * 2. Multi-captures before single captures (more captures = higher priority)
 * 3. Promotions (moves where promotion = true)
 */
function orderMoves(
  _board: Cell[][],
  moves: Move[],
  _ruleset: RuleSet,
  _team: Team
): Move[] {
  return [...moves].sort((a, b) => {
    // 1. Captures before non-captures
    const aCapture = a.captures.length > 0;
    const bCapture = b.captures.length > 0;
    if (aCapture !== bCapture) {
      return aCapture ? -1 : 1;
    }

    // 2. More captures before fewer captures
    if (aCapture && bCapture) {
      return b.captures.length - a.captures.length;
    }

    // 3. Promotions before non-promotions
    if (a.promotion !== b.promotion) {
      return a.promotion ? -1 : 1;
    }

    return 0;
  });
}
