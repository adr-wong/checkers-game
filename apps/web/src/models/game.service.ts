import { Game, IGame } from './game.model';
import { validateRuleSet, type RuleSet, type Move } from '@checkers/shared';

// Strip ruleset field from move before storing in history
export function stripRulesetFromMove(move: Move): Omit<Move, 'ruleset'> {
  const { ruleset: _, ...moveToStore } = move;
  return moveToStore;
}

// Create a new game
export async function createGame(
  ruleset: RuleSet,
  mode: 'pvp' | 'pva' | 'ava',
  difficulty?: 'easy' | 'medium' | 'hard',
  ai_team?: 'red' | 'black'
): Promise<IGame> {
  // Validate ruleset
  const rulesetErrors = validateRuleSet(ruleset);
  if (rulesetErrors.length > 0) {
    throw new Error(`Invalid ruleset: ${rulesetErrors[0]}`);
  }

  // Validate mode-specific fields
  if (mode !== 'pvp' && (!difficulty || !ai_team)) {
    throw new Error('AI games require difficulty and ai_team');
  }

  // Create initial board using ruleset
  const initialBoard = ruleset.startingLayout === 'standard'
    ? buildStandardLayout(ruleset)
    : buildCustomLayout(ruleset);

  const game = new Game({
    ruleset,
    mode,
    difficulty: mode !== 'pvp' ? difficulty : undefined,
    ai_team: mode !== 'pvp' ? ai_team : undefined,
    board: initialBoard,
    turn: 'red', // Red always moves first
    status: 'active',
    move_count: 0,
    history: []
  });

  return await game.save();
}

// Get game by ID
export async function getGameById(gameId: string): Promise<IGame | null> {
  return await Game.findById(gameId);
}

// Update game state
export async function updateGame(
  gameId: string,
  updates: Partial<IGame>
): Promise<IGame | null> {
  return await Game.findByIdAndUpdate(gameId, updates, { returnDocument: 'after' });
}

// Add move to game history
export async function addMoveToHistory(
  gameId: string,
  move: Move
): Promise<IGame | null> {
  // Strip ruleset field before storing
  const moveToStore = stripRulesetFromMove(move);
  
  return await Game.findByIdAndUpdate(
    gameId,
    {
      $push: { history: moveToStore },
      $inc: { move_count: 1 },
      $set: { updated_at: new Date() }
    },
    { returnDocument: 'after' }
  );
}

// Helper function to build standard layout
export function buildStandardLayout(ruleset: RuleSet): string {
  const { boardSize } = ruleset;
  const rowsOfPieces = Math.floor(boardSize / 2) - 1;
  const totalCells = boardSize * boardSize;
  let result = '';

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const isDark = (row + col) % 2 !== 0;
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

// Helper function to build custom layout
export function buildCustomLayout(ruleset: RuleSet): string {
  if (ruleset.startingLayout === 'standard') {
    return buildStandardLayout(ruleset);
  }

  const { boardSize } = ruleset;
  const customLayout = ruleset.startingLayout;
  let board = '';

  // Initialize empty board
  for (let i = 0; i < boardSize * boardSize; i++) {
    board += '#';
  }

  // Place custom pieces
  for (const piece of customLayout.pieces) {
    const index = piece.row * boardSize + piece.col;
    const char = piece.team === 'red'
      ? (piece.type === 'king' ? 'R' : 'r')
      : (piece.type === 'king' ? 'B' : 'b');
    board = board.substring(0, index) + char + board.substring(index + 1);
  }

  // Set light squares to '-'
  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      if ((row + col) % 2 === 0) {
        const index = row * boardSize + col;
        board = board.substring(0, index) + '-' + board.substring(index + 1);
      }
    }
  }

  return board;
}