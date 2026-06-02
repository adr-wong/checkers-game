import { type Cell, type Team, type Move, type GameOverResult } from "./types";
import { type RuleSet, getPromotionRow, isDarkSquare, inBounds } from "./ruleset";

const VALID_CHARS = /^[#\-rRbB]+$/;
const CHAR_TO_TEAM: Record<string, Team> = {
  r: "red",
  R: "red",
  b: "black",
  B: "black",
};
const CHAR_TO_TYPE: Record<string, "normal" | "king"> = {
  r: "normal",
  R: "king",
  b: "normal",
  B: "king",
};

/**
 * Returns the set of [dRow, dCol] unit vectors that a piece of the given
 * team and type may move toward, based on the ruleset.
 */
function getMovementDirections(
  team: Team,
  pieceType: "normal" | "king",
  ruleset: RuleSet,
  captureContext: boolean
): [number, number][] {
  const isKing = pieceType === "king";
  const forward = team === "red" ? 1 : -1;

  if (isKing) {
    // ruleset.kingMoveDistance: kings move in all diagonal directions
    return [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  }

  if (ruleset.normalMoveDirections === "all") {
    // ruleset.normalMoveDirections 'all': normal pieces move in all diagonals
    return [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  }

  if (ruleset.normalMoveDirections === "orthogonal") {
    // ruleset.normalMoveDirections 'orthogonal': Turkish draughts movement
    return [[0, 1], [0, -1], [1, 0], [-1, 0]];
  }

  // ruleset.normalMoveDirections 'forward': normal piece forward direction
  const directions: [number, number][] = [[forward, 1], [forward, -1]];

  // ruleset.captureBackward: allow backward capture for normal pieces
  if (captureContext && ruleset.captureBackward) {
    // Append backward diagonals for capture context
    directions.push([forward * -1, 1], [forward * -1, -1]);
  }

  return directions;
}

/**
 * Converts a flat board string into a 2D array of Cell objects.
 * Index formula: board[row * ruleset.boardSize + col]
 */
function parseBoardString(board: string, ruleset: RuleSet): Cell[][] {
  const size = ruleset.boardSize;
  if (!VALID_CHARS.test(board)) {
    throw new Error("Invalid board string: contains characters other than #-rRbB");
  }
  if (board.length !== size * size) {
    throw new Error(`Board string length ${board.length} does not match size² = ${size * size}`);
  }

  const cells: Cell[][] = [];
  for (let row = 0; row < size; row++) {
    cells[row] = [];
    for (let col = 0; col < size; col++) {
      const char = board[row * size + col];
      cells[row][col] = char === "-" || char === "#"
        ? { piece: null }
        : { piece: { team: CHAR_TO_TEAM[char], type: CHAR_TO_TYPE[char] } };
    }
  }
  return cells;
}

/**
 * Converts a 2D Cell array back into a flat board string.
 * Empty dark squares serialize as '#'. Light squares serialize as '-'.
 */
function serializeBoardString(cells: Cell[][], ruleset: RuleSet): string {
  const size = ruleset.boardSize;
  if (cells.length !== size) {
    throw new Error(`Cells array length ${cells.length} does not match size ${size}`);
  }
  for (let row = 0; row < size; row++) {
    if (cells[row].length !== size) {
      throw new Error(`Row ${row} length ${cells[row].length} does not match size ${size}`);
    }
  }

  let result = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const cell = cells[row][col];
      if (cell.piece === null) {
        result += isDarkSquare(row, col) ? "#" : "-";
      } else {
        const char = cell.piece.team === "red"
          ? (cell.piece.type === "normal" ? "r" : "R")
          : (cell.piece.type === "normal" ? "b" : "B");
        result += char;
      }
    }
  }
  return result;
}

/**
 * Recursively generates all legal moves for a single piece at [row, col].
 */
function getLegalMovesFromPiece(
  board: Cell[][],
  ruleset: RuleSet,
  team: Team,
  row: number,
  col: number,
  accumulatedCaptures: [number, number][]
): Move[] {
  const piece = board[row][col].piece;
  if (piece === null || piece.team !== team) {
    return [];
  }

  const size = ruleset.boardSize;
  const isKing = piece.type === "king";
  const backRank = getPromotionRow(team, ruleset);

  // Ruleset-driven movement: regular moves use forward directions, captures use capture directions
  const moveDirections = getMovementDirections(team, piece.type, ruleset, false);
  const captureDirections = getMovementDirections(team, piece.type, ruleset, true);

  const moves: Move[] = [];

  // --- CAPTURE MOVES ---
  // Always use captureDirections for capture attempts (fixes backward capture bug)
  for (const [dRow, dCol] of captureDirections) {
    if (isKing && ruleset.kingMoveDistance === "flying") {
      // Flying king: slide along diagonal to find enemy piece to capture
      let slideRow = row + dRow;
      let slideCol = col + dCol;
      let enemyRow = -1;
      let enemyCol = -1;

      while (inBounds(slideRow, slideCol, size)) {
        const pieceAt = board[slideRow][slideCol].piece;
        if (pieceAt !== null) {
          if (pieceAt.team !== team) {
            // Enemy piece found - record and stop
            enemyRow = slideRow;
            enemyCol = slideCol;
          }
          // Any piece (friendly or enemy) stops our slide
          break;
        }
        slideRow += dRow;
        slideCol += dCol;
      }

      // If enemy found, find all landing squares beyond it
      if (enemyRow !== -1) {
        let landRow = enemyRow + dRow;
        let landCol = enemyCol + dCol;

        while (inBounds(landRow, landCol, size)) {
          const landCell = board[landRow][landCol].piece;
          if (landCell !== null) break; // Land square occupied, stop

          const alreadyCaptured = accumulatedCaptures.some(
            ([r, c]) => r === enemyRow && c === enemyCol
          );
          if (!alreadyCaptured) {
            const newCaptures: [number, number][] = [...accumulatedCaptures, [enemyRow, enemyCol] as [number, number]];
            const willPromote = !isKing && landRow === backRank;

            // ruleset.promotionEndsJump: promotion stops the jump chain
            if (willPromote && ruleset.promotionEndsJump) {
              moves.push({
                from: [row, col] as [number, number],
                to: [landRow, landCol] as [number, number],
                captures: newCaptures,
                promotion: true,
                ruleset,
              });
            } else {
              const boardAfter: Cell[][] = board.map((r) =>
                r.map((cell) => ({ piece: cell.piece ? { ...cell.piece } : null }))
              );
              boardAfter[landRow][landCol].piece = boardAfter[row][col].piece;
              boardAfter[row][col].piece = null;
              boardAfter[enemyRow][enemyCol].piece = null;

              if (willPromote) {
                boardAfter[landRow][landCol].piece!.type = "king";
              }

              const cont = getLegalMovesFromPiece(
                boardAfter, ruleset, team, landRow, landCol, newCaptures
              );

              // Issue 1 fix: Propagate promotion flag to continuation moves
              // Issue fix: Always use continuation moves when available, with correct from
              if (cont.length > 0) {
                for (const m of cont) {
                  m.from = [row, col] as [number, number];
                  if (willPromote) m.promotion = true;
                }
                moves.push(...cont);
              } else {
                moves.push({
                  from: [row, col] as [number, number],
                  to: [landRow, landCol] as [number, number],
                  captures: newCaptures,
                  promotion: willPromote,
                  ruleset,
                });
              }
            }
          }
          landRow += dRow;
          landCol += dCol;
        }
      }
    } else {
      // Short king or normal piece: single-square jump
      const capDestRow = row + dRow * 2;
      const capDestCol = col + dCol * 2;

      if (inBounds(capDestRow, capDestCol, size)) {
        const midPiece = board[row + dRow]?.[col + dCol]?.piece;
        const destCell = board[capDestRow][capDestCol];

        if (midPiece && midPiece.team !== team && !destCell.piece && isDarkSquare(capDestRow, capDestCol)) {
          const capturePos: [number, number] = [row + dRow, col + dCol];
          const alreadyCaptured = accumulatedCaptures.some(
            ([r, c]) => r === capturePos[0] && c === capturePos[1]
          );
          if (alreadyCaptured) continue;

          const newCaptures: [number, number][] = [...accumulatedCaptures, capturePos];
          const willPromote = !isKing && capDestRow === backRank;

          // ruleset.promotionEndsJump
          if (willPromote && ruleset.promotionEndsJump) {
            moves.push({
              from: [row, col] as [number, number],
              to: [capDestRow, capDestCol] as [number, number],
              captures: newCaptures,
              promotion: true,
              ruleset,
            });
          } else {
            const boardAfter: Cell[][] = board.map((r) =>
              r.map((cell) => ({ piece: cell.piece ? { ...cell.piece } : null }))
            );
            boardAfter[capDestRow][capDestCol].piece = boardAfter[row][col].piece;
            boardAfter[row][col].piece = null;
            boardAfter[capturePos[0]][capturePos[1]].piece = null;

            if (willPromote) {
              boardAfter[capDestRow][capDestCol].piece!.type = "king";
            }

            const cont = getLegalMovesFromPiece(
              boardAfter, ruleset, team, capDestRow, capDestCol, newCaptures
            );

            // Issue 1 fix: Propagate promotion flag to continuation moves
            // Issue fix: Always use continuation moves when available, with correct from
            if (cont.length > 0) {
              for (const m of cont) {
                m.from = [row, col] as [number, number];
                if (willPromote) m.promotion = true;
              }
              moves.push(...cont);
            } else {
              moves.push({
                from: [row, col] as [number, number],
                to: [capDestRow, capDestCol] as [number, number],
                captures: newCaptures,
                promotion: willPromote,
                ruleset,
              });
            }
          }
        }
      }
    }
  }

  // --- REGULAR (NON-CAPTURE) MOVES ---
  // ruleset.captureRequired: only add if no captures in progress
  if (accumulatedCaptures.length === 0) {
    for (const [dRow, dCol] of moveDirections) {
      if (isKing && ruleset.kingMoveDistance === "flying") {
        // Flying king slides along empty squares
        let slideRow = row + dRow;
        let slideCol = col + dCol;

        while (inBounds(slideRow, slideCol, size)) {
          const pieceAt = board[slideRow][slideCol].piece;
          if (pieceAt !== null) break;

          moves.push({
            from: [row, col],
            to: [slideRow, slideCol],
            captures: [],
            promotion: false, // Already a king, no promotion
            ruleset,
          });
          slideRow += dRow;
          slideCol += dCol;
        }
      } else {
        // Normal piece or short king: single-step move
        const toRow = row + dRow;
        const toCol = col + dCol;

        if (inBounds(toRow, toCol, size) && isDarkSquare(toRow, toCol) && !board[toRow][toCol].piece) {
          const willPromote = !isKing && toRow === backRank;
          moves.push({
            from: [row, col],
            to: [toRow, toCol],
            captures: [],
            promotion: willPromote,
            ruleset,
          });
        }
      }
    }
  }

  return moves;
}

/**
 * Returns all legal moves for the given team under the given ruleset.
 */
function getLegalMoves(
  board: Cell[][],
  ruleset: RuleSet,
  team: Team
): Move[] {
  const allMoves: Move[] = [];
  const size = ruleset.boardSize;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const cell = board[row][col];
      if (cell.piece?.team === team) {
        const pieceMoves = getLegalMovesFromPiece(board, ruleset, team, row, col, []);
        allMoves.push(...pieceMoves);
      }
    }
  }

  // ruleset.captureRequired: filter to captures only if any exist
  const captureMoves = allMoves.filter((m) => m.captures.length > 0);
  if (captureMoves.length === 0) {
    return allMoves;
  }

  // ruleset.captureMaximum: filter to max capture count
  const maxCaptures = Math.max(...captureMoves.map((m) => m.captures.length));
  return captureMoves.filter((m) => m.captures.length === maxCaptures);
}

/**
 * Applies a move to the board and returns the new board state.
 * Does not mutate the input board — returns a deep copy.
 */
function applyMove(
  board: Cell[][],
  move: Move,
  ruleset: RuleSet
): Cell[][] {
  // Issue 4 fix: Validate move ruleset matches passed ruleset
  if (move.ruleset.name !== ruleset.name || move.ruleset.boardSize !== ruleset.boardSize) {
    throw new Error("Mismatched ruleset context: Move structural payload does not match active game ruleset execution.");
  }

  // Step 1: Deep copy
  const newBoard: Cell[][] = board.map((row) =>
    row.map((cell) => ({ piece: cell.piece ? { ...cell.piece } : null }))
  );

  const [fromRow, fromCol] = move.from;
  const [toRow, toCol] = move.to;

  // Step 2: Move the piece
  newBoard[toRow][toCol].piece = { ...newBoard[fromRow][fromCol].piece! };
  newBoard[fromRow][fromCol].piece = null;

  // Step 3: Clear captured pieces
  for (const [capRow, capCol] of move.captures) {
    newBoard[capRow][capCol].piece = null;
  }

  // Step 4: Handle promotion
  if (move.promotion) {
    newBoard[toRow][toCol].piece!.type = "king";
  }

  return newBoard;
}

/**
 * Determines whether the game is over.
 */
function isGameOver(
  board: Cell[][],
  ruleset: RuleSet
): GameOverResult | null {
  const size = ruleset.boardSize;
  let redPieces = 0;
  let blackPieces = 0;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const piece = board[row][col].piece;
      if (piece) {
        if (piece.team === "red") redPieces++;
        else blackPieces++;
      }
    }
  }

  // Check order per spec
  if (redPieces === 0) return { winner: "black" };
  if (blackPieces === 0) return { winner: "red" };

  const redMoves = getLegalMoves(board, ruleset, "red");
  const blackMoves = getLegalMoves(board, ruleset, "black");

  if (redMoves.length === 0 && blackMoves.length === 0) {
    return { winner: "draw" };
  }

  // One team has no legal moves — they lose
  if (redMoves.length === 0) return { winner: "black" };
  if (blackMoves.length === 0) return { winner: "red" };

  return null;
}

export {
  parseBoardString,
  serializeBoardString,
  getLegalMoves,
  applyMove,
  isGameOver,
};