/**
 * eval.ts — Board evaluation function for the checkers AI.
 *
 * Scores a board from the perspective of one team.
 * Positive score = better for that team.
 * Both the minimax and A* engines use this same function.
 */

import type { Cell, Team, RuleSet } from "@checkers/shared";
import type { Difficulty } from "../types";
import { getLegalMoves, getPromotionRow, isDarkSquare } from "@checkers/shared";

// ─── Scoring Constants ──────────────────────────────────────────────────────

/** Center control bonus per piece in the center region. Chosen as a moderate positional weight. */
const CENTER_BONUS = 10;

/** Back rank bonus per piece on the team's home row. Guards against easy opponent promotion. */
const BACK_RANK_BONUS = 15;

/** Mobility bonus per legal move available. Mobility is a meaningful positional signal. */
const MOBILITY_BONUS = 5;

/** Advancement bonus per row advanced toward opponent's back rank. Rewards forward progress. */
const ADVANCEMENT_BONUS = 3;

// ─── Piece Value Calculation ────────────────────────────────────────────────

/**
 * Returns piece values scaled to the active ruleset.
 * Flying kings dominate the board far more than short kings.
 *
 * kingMoveDistance 'single'                        : normal=100, king=160
 * kingMoveDistance 'flying'                        : normal=100, king=280
 * kingMoveDistance 'flying' + captureMaximum true  : normal=100, king=320
 */
function getPieceValues(ruleset: RuleSet): { normal: number; king: number } {
  const normal = 100;
  if (ruleset.kingMoveDistance === "single") {
    return { normal, king: 160 };
  }
  if (ruleset.captureMaximum) {
    return { normal, king: 320 };
  }
  return { normal, king: 280 };
}

// ─── Scoring Components ─────────────────────────────────────────────────────

/**
 * Material score.
 * Sum of piece values for the given team minus sum for the opponent.
 * Uses getPieceValues(ruleset) for weights.
 */
function scoreMaterial(board: Cell[][], team: Team, ruleset: RuleSet): number {
  const values = getPieceValues(ruleset);
  const opponent = team === "red" ? "black" : "red";
  const size = ruleset.boardSize;
  let score = 0;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const piece = board[row][col].piece;
      if (!piece) continue;
      const value = piece.type === "king" ? values.king : values.normal;
      if (piece.team === team) {
        score += value;
      } else if (piece.team === opponent) {
        score -= value;
      }
    }
  }

  return score;
}

/**
 * Center control bonus.
 * For 8x8: the center region is rows 2-5, cols 2-5 (16 squares).
 * For 10x10: rows 3-6, cols 3-6 (16 squares).
 * Award +CENTER_BONUS per piece of the given team in that region.
 */
function scoreCenter(board: Cell[][], team: Team, ruleset: RuleSet): number {
  const size = ruleset.boardSize;
  const start = size === 8 ? 2 : 3;
  const end = size === 8 ? 5 : 6;
  const opponent = team === "red" ? "black" : "red";
  let score = 0;

  for (let row = start; row <= end; row++) {
    for (let col = start; col <= end; col++) {
      const piece = board[row][col].piece;
      if (!piece) continue;
      if (piece.team === team) {
        score += CENTER_BONUS;
      } else if (piece.team === opponent) {
        score -= CENTER_BONUS;
      }
    }
  }

  return score;
}

/**
 * Back rank bonus.
 * Pieces on the team's own back rank (promotion row of the OPPONENT,
 * i.e. the row the team started on) guard against easy opponent promotion.
 * Award +BACK_RANK_BONUS per piece on that row.
 */
function scoreBackRank(board: Cell[][], team: Team, ruleset: RuleSet): number {
  const opponent = team === "red" ? "black" : "red";
  // The team's own back rank is the opponent's promotion row
  const backRankRow = getPromotionRow(opponent, ruleset);
  const size = ruleset.boardSize;
  let score = 0;

  for (let col = 0; col < size; col++) {
    const piece = board[backRankRow][col].piece;
    if (!piece) continue;
    if (piece.team === team) {
      score += BACK_RANK_BONUS;
    } else if (piece.team === opponent) {
      score -= BACK_RANK_BONUS;
    }
  }

  return score;
}

/**
 * Mobility bonus.
 * Count of legal moves available to the team.
 * Award +MOBILITY_BONUS per legal move.
 * Note: calling getLegalMoves here is intentional despite its cost.
 * Mobility is a meaningful positional signal worth the extra work.
 */
function scoreMobility(board: Cell[][], team: Team, ruleset: RuleSet): number {
  const opponent = team === "red" ? "black" : "red";
  const myMoves = getLegalMoves(board, ruleset, team).length;
  const oppMoves = getLegalMoves(board, ruleset, opponent).length;
  return (myMoves - oppMoves) * MOBILITY_BONUS;
}

/**
 * Advancement bonus.
 * For each normal piece, award +ADVANCEMENT_BONUS per row advanced
 * toward the opponent's back rank.
 * Row distance for red: row index (0 = home, boardSize-1 = opponent back)
 * Row distance for black: (boardSize - 1 - row index)
 * Do not award advancement bonus for kings.
 */
function scoreAdvancement(board: Cell[][], team: Team, ruleset: RuleSet): number {
  const size = ruleset.boardSize;
  const opponent = team === "red" ? "black" : "red";
  let score = 0;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const piece = board[row][col].piece;
      if (!piece || piece.type === "king") continue;
      if (piece.team === team) {
        const advancement = team === "red" ? row : size - 1 - row;
        score += advancement * ADVANCEMENT_BONUS;
      } else if (piece.team === opponent) {
        const advancement = opponent === "red" ? row : size - 1 - row;
        score -= advancement * ADVANCEMENT_BONUS;
      }
    }
  }

  return score;
}

// ─── Main Evaluation ────────────────────────────────────────────────────────

/**
 * Main evaluation function.
 * Combines all components for the given team minus the same components
 * for the opponent. Returns a signed integer.
 *
 * Score = (material + center + backRank + mobility + advancement) for team
 *       - (material + center + backRank + mobility + advancement) for opponent
 *
 * All scoring constants are defined at the top of this file as named
 * constants so they can be changed in one place.
 */
export function evaluate(
  board: Cell[][],
  team: Team,
  ruleset: RuleSet
): number {
  const material = scoreMaterial(board, team, ruleset);
  const center = scoreCenter(board, team, ruleset);
  const backRank = scoreBackRank(board, team, ruleset);
  const mobility = scoreMobility(board, team, ruleset);
  const advancement = scoreAdvancement(board, team, ruleset);

  return material + center + backRank + mobility + advancement;
}
