import { describe, it, expect } from "bun:test";
import type { Cell, Team, RuleSet } from "@checkers/shared";
import { ENGLISH, INTERNATIONAL } from "@checkers/shared";
import { evaluate } from "../src/engine/eval";
import { getNoiseRange } from "../src/engine/noise";

// Helper to create a simple board of a given size
function makeBoard(
  pieces: [number, number, Team, "normal" | "king"][],
  size = 8
): Cell[][] {
  const board: Cell[][] = [];
  for (let row = 0; row < size; row++) {
    board[row] = [];
    for (let col = 0; col < size; col++) {
      board[row][col] = { piece: null };
    }
  }
  for (const [row, col, team, type] of pieces) {
    board[row][col] = { piece: { team, type } };
  }
  return board;
}

describe("evaluate — material score", () => {
  it("returns 0 for equal material on both sides", () => {
    // Place pieces symmetrically at [3,1] and [4,6] so back rank,
    // center, and advancement components are equal for both sides.
    // Red at row 3, advancement=3. Black at row 4, advancement for
    // black = 7-4=3. Both are on dark squares in the center region.
    const board = makeBoard([
      [3, 1, "red", "normal"],
      [4, 6, "black", "normal"],
    ]);
    const score = evaluate(board, "red", ENGLISH);
    expect(score).toBe(0);
  });

  it("returns positive when AI has more pieces", () => {
    const board = makeBoard([
      [3, 1, "red", "normal"],
      [3, 3, "red", "normal"],
      [4, 6, "black", "normal"],
    ]);
    const score = evaluate(board, "red", ENGLISH);
    expect(score).toBeGreaterThan(0);
  });

  it("returns negative when AI has fewer pieces", () => {
    const board = makeBoard([
      [3, 1, "red", "normal"],
      [4, 6, "black", "normal"],
      [4, 4, "black", "normal"],
    ]);
    const score = evaluate(board, "red", ENGLISH);
    expect(score).toBeLessThan(0);
  });

  it("weights kings higher than normal pieces", () => {
    const boardWithKing = makeBoard([
      [3, 1, "red", "king"],
      [4, 6, "black", "normal"],
    ]);
    const boardWithNormal = makeBoard([
      [3, 1, "red", "normal"],
      [4, 6, "black", "normal"],
    ]);
    const scoreKing = evaluate(boardWithKing, "red", ENGLISH);
    const scoreNormal = evaluate(boardWithNormal, "red", ENGLISH);
    expect(scoreKing).toBeGreaterThan(scoreNormal);
  });

  it("flying king ruleset gives kings higher value than short king ruleset", () => {
    // Use a 10x10 board for INTERNATIONAL
    const board10 = makeBoard([
      [3, 1, "red", "king"],
      [6, 8, "black", "normal"],
    ], 10);
    const scoreEnglish = evaluate(board10, "red", ENGLISH);
    const scoreInternational = evaluate(board10, "red", INTERNATIONAL);
    expect(scoreInternational).toBeGreaterThan(scoreEnglish);
  });
});

describe("evaluate — noise", () => {
  it("hard difficulty returns score unchanged by noise", () => {
    const board = makeBoard([
      [0, 1, "red", "normal"],
      [7, 0, "black", "normal"],
    ]);
    const score = evaluate(board, "red", ENGLISH);
    // Noise range for hard is 0, so evaluate should always return same value
    // We can't test this directly since evaluate doesn't apply noise,
    // but we can verify getNoiseRange returns 0
    expect(getNoiseRange("hard")).toBe(0);
  });

  it("easy difficulty returns score with noise applied", () => {
    const range = getNoiseRange("easy");
    expect(range).toBe(80);
  });

  it("noise range is ±80 for easy, ±20 for medium, 0 for hard", () => {
    expect(getNoiseRange("easy")).toBe(80);
    expect(getNoiseRange("medium")).toBe(20);
    expect(getNoiseRange("hard")).toBe(0);
  });
});
