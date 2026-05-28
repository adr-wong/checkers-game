import { type Team, type PieceType } from "./types";

/**
 * Describes a non-standard starting piece layout.
 * Used when startingLayout is set to 'custom'.
 */
export type CustomLayout = {
  pieces: Array<{
    row: number;
    col: number;
    team: Team;
    type: PieceType;
  }>;
};

/**
 * A complete description of the rules governing one game of checkers.
 */
export type RuleSet = {
  name: string;
  boardSize: 8 | 10;
  normalMoveDirections: 'forward' | 'all' | 'orthogonal';
  kingMoveDistance: 'single' | 'flying';
  captureRequired: boolean;
  captureMaximum: boolean;
  captureBackward: boolean;
  promotionEndsJump: boolean;
  startingLayout: 'standard' | CustomLayout;
};

export const ENGLISH: RuleSet = {
  name: 'English Draughts',
  boardSize: 8,
  normalMoveDirections: 'forward',
  kingMoveDistance: 'single',
  captureRequired: true,
  captureMaximum: false,
  captureBackward: false,
  promotionEndsJump: true,
  startingLayout: 'standard',
};

export const INTERNATIONAL: RuleSet = {
  name: 'International Draughts',
  boardSize: 10,
  normalMoveDirections: 'forward',
  kingMoveDistance: 'flying',
  captureRequired: true,
  captureMaximum: true,
  captureBackward: true,
  promotionEndsJump: true,
  startingLayout: 'standard',
};

export const BRAZILIAN: RuleSet = {
  name: 'Brazilian Draughts',
  boardSize: 8,
  normalMoveDirections: 'forward',
  kingMoveDistance: 'flying',
  captureRequired: true,
  captureMaximum: true,
  captureBackward: true,
  promotionEndsJump: true,
  startingLayout: 'standard',
};

export const RUSSIAN: RuleSet = {
  name: 'Russian Draughts',
  boardSize: 8,
  normalMoveDirections: 'forward',
  kingMoveDistance: 'flying',
  captureRequired: true,
  captureMaximum: false,
  captureBackward: false,
  promotionEndsJump: false,
  startingLayout: 'standard',
};

export const POOL: RuleSet = {
  name: 'Pool Checkers',
  boardSize: 8,
  normalMoveDirections: 'all',
  kingMoveDistance: 'flying',
  captureRequired: true,
  captureMaximum: false,
  captureBackward: true,
  promotionEndsJump: true,
  startingLayout: 'standard',
};

export const PRESET_RULESETS: Record<string, RuleSet> = {
  english: ENGLISH,
  international: INTERNATIONAL,
  brazilian: BRAZILIAN,
  russian: RUSSIAN,
  pool: POOL,
};

export function getPromotionRow(team: Team, ruleset: RuleSet): number {
  return team === 'red' ? ruleset.boardSize - 1 : 0;
}

export function isDarkSquare(row: number, col: number): boolean {
  return (row + col) % 2 !== 0;
}

export function inBounds(row: number, col: number, size: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size;
}

export function buildStandardLayout(ruleset: RuleSet): string {
  const { boardSize } = ruleset;
  const rowsOfPieces = Math.floor(boardSize / 2) - 1;
  const totalCells = boardSize * boardSize;
  let result = '';

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const isDark = isDarkSquare(row, col);
      let char = isDark ? '#' : '-';

      if (isDark) {
        if (row < rowsOfPieces) {
          char = 'r';
        } else if (row >= boardSize - rowsOfPieces) {
          char = 'b';
        }
      }
      result += char;
    }
  }
  return result;
}

export function validateRuleSet(ruleset: RuleSet): string[] {
  const errors: string[] = [];

  if (ruleset.boardSize !== 8 && ruleset.boardSize !== 10) {
    errors.push('boardSize must be 8 or 10');
  }

  if (ruleset.captureMaximum && !ruleset.captureRequired) {
    errors.push('captureMaximum requires captureRequired');
  }

  if (typeof ruleset.startingLayout === 'object') {
    const piecePositions = new Set<string>();
    const layout = ruleset.startingLayout as CustomLayout;
    for (const p of layout.pieces) {
      if (!inBounds(p.row, p.col, ruleset.boardSize)) {
        errors.push(`CustomLayout piece at [${p.row},${p.col}] out of bounds`);
        continue;
      }
      if (!isDarkSquare(p.row, p.col)) {
        errors.push(`CustomLayout piece at [${p.row},${p.col}] not on dark square`);
      }
      const posKey = `${p.row},${p.col}`;
      if (piecePositions.has(posKey)) {
        errors.push(`Duplicate piece at [${p.row},${p.col}]`);
      }
      piecePositions.add(posKey);
    }
  }

  return errors;
}