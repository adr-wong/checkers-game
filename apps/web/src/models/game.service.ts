import { Game, IGame } from './game.model';
import { validateRuleSet, type RuleSet, type Move, buildStandardLayout } from '@checkers/shared';

// buildStandardLayout is imported from @checkers/shared

// Create a new game
export async function createGame(
  ruleset: RuleSet,
  mode: 'pvp' | 'pva' | 'ava',
  difficulty?: 'easy' | 'medium' | 'hard',
  ai_team?: 'red' | 'black',
  algorithm?: 'minimax' | 'astar'
): Promise<IGame> {
  // Validate ruleset
  const rulesetErrors = validateRuleSet(ruleset);
  if (rulesetErrors.length > 0) {
    throw new Error(`Invalid ruleset: ${rulesetErrors[0]}`);
  }

   // Validate mode-specific fields
  if (mode !== 'pvp' && (!difficulty || !ai_team || !algorithm)) {
    throw new Error('AI games require difficulty, ai_team, and algorithm');
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
    algorithm: mode !== 'pvp' ? algorithm : undefined,
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
  return await Game.findByIdAndUpdate(
    gameId,
    { ...updates, updated_at: new Date() },
    { returnDocument: 'after' }
  );
}

// Add move to game history
export async function addMoveToHistory(
  gameId: string,
  move: Move,
  boardAfter: string
): Promise<IGame | null> {
  // Convert move to history entry and strip ruleset
  const { ruleset: _, ...moveData } = move;
  const historyEntry = {
    ...moveData,
    board_after: boardAfter,
    timestamp: new Date()
  };
  
  // Determine next turn (flip current turn)
  const game = await Game.findById(gameId);
  if (!game) return null;
  
  const nextTurn = game.turn === 'red' ? 'black' : 'red';
  
  return await Game.findByIdAndUpdate(
    gameId,
    {
      $push: { history: historyEntry },
      $inc: { move_count: 1 },
      $set: {
        board: boardAfter,
        turn: nextTurn,
        updated_at: new Date()
      }
    },
    { returnDocument: 'after' }
  );
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