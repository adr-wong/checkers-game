import { type RuleSet } from "./ruleset";

export type Team = "red" | "black";

export type PieceType = "normal" | "king";

export type Cell = {
  piece: { team: Team; type: PieceType } | null;
};

/**
 * Represents a single complete move, including all legs of a multi-jump.
 * The ruleset field records which rules were in effect when the move
 * was generated, allowing the move to be safely re-validated later.
 */
export type Move = {
  from: [number, number];
  to: [number, number];
  captures: [number, number][];
  promotion: boolean;
  ruleset: RuleSet;
};

export type GameOverResult = {
  winner: Team | "draw";
};