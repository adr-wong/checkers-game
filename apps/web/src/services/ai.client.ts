import { type Move, type RuleSet, parseBoardString, isGameOver } from '@checkers/shared';
import { addMoveToHistory, updateGame } from '../models/game.service.ts';

// Configuration for AI service
// In a real application, this would come from environment variables
const AI_SERVICE_BASE_URL = 'http://localhost:4000';

export class AiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiServiceError';
  }
}

/**
 * Requests an AI move from the AI service
 * @param team - The team the AI is playing as ('red' or 'black')
 * @param difficulty - The difficulty level ('easy', 'medium', or 'hard')
 * @param algorithm - The algorithm to use ('minimax' or 'astar')
 * @param board - The current board state as a string
 * @param ruleset - The ruleset being used
 * @returns Promise resolving to the AI's move and resulting board
 * @throws Error if the request fails or is invalid
 */
export async function requestAiMove(
  team: 'red' | 'black',
  difficulty: 'easy' | 'medium' | 'hard',
  algorithm: 'minimax' | 'astar',
  board: string,
  ruleset: RuleSet
): Promise<{
  move: Omit<Move, 'ruleset'>;
  resultingBoard: string;
  algorithm: string;
}> {
  // Validate inputs
  if (!['red', 'black'].includes(team)) {
    throw new AiServiceError('Invalid team: must be "red" or "black"');
  }
  
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    throw new AiServiceError('Invalid difficulty: must be "easy", "medium", or "hard"');
  }
  
  if (!['minimax', 'astar'].includes(algorithm)) {
    throw new AiServiceError('Invalid algorithm: must be "minimax" or "astar"');
  }
  
  if (typeof board !== 'string' || board.length === 0) {
    throw new AiServiceError('Invalid board: must be a non-empty string');
  }

  try {
    const response = await fetch(`${AI_SERVICE_BASE_URL}/move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        team,
        difficulty,
        algorithm,
        board,
        ruleset,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `AI service returned status ${response.status}`;
      throw new AiServiceError(errorMessage);
    }

    const data = await response.json();

    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new AiServiceError('Invalid response from AI service');
    }

    if (!Array.isArray(data.from) || data.from.length !== 2 ||
        !Array.isArray(data.to) || data.to.length !== 2) {
      throw new AiServiceError('Invalid move coordinates in AI response');
    }

    if (!Array.isArray(data.captures)) {
      throw new AiServiceError('Invalid captures in AI response');
    }

    if (typeof data.promotion !== 'boolean') {
      throw new AiServiceError('Invalid promotion flag in AI response');
    }

    if (typeof data.resulting_board !== 'string') {
      throw new AiServiceError('Invalid resulting board in AI response');
    }

    if (typeof data.algorithm !== 'string') {
      throw new AiServiceError('Invalid algorithm in AI response');
    }

    return {
      move: {
        from: data.from,
        to: data.to,
        captures: data.captures,
        promotion: data.promotion,
      },
      resultingBoard: data.resulting_board,
      algorithm: data.algorithm,
    };
  } catch (error) {
    if (error instanceof AiServiceError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new AiServiceError(`Failed to request AI move: ${error.message}`);
    }
    throw new AiServiceError('Failed to request AI move: unknown error');
  }
}

/**
 * Triggers the AI's turn in a game
 * @param gameId - The ID of the game
 * @param team - The team the AI is playing as
 * @param difficulty - The difficulty level
 * @param algorithm - The algorithm to use
 * @param currentBoard - The current board state
 * @param ruleset - The ruleset being used
 * @returns Promise resolving to the updated game state
 * @throws AiServiceError if the AI move cannot be processed
 */
export async function triggerAiTurn(
  gameId: string,
  team: 'red' | 'black',
  difficulty: 'easy' | 'medium' | 'hard',
  algorithm: 'minimax' | 'astar',
  currentBoard: string,
  ruleset: RuleSet
): Promise<{
  move: Omit<Move, 'ruleset'>;
  resultingBoard: string;
  nextTurn: 'red' | 'black';
}> {
  try {
    // Request AI move
    const { move, resultingBoard } = await requestAiMove(
      team,
      difficulty,
      algorithm,
      currentBoard,
      ruleset
    );

    // Add move to history
    const updatedGame = await addMoveToHistory(gameId, { ...move, ruleset }, resultingBoard);

    if (!updatedGame) {
      throw new AiServiceError('Failed to add AI move to history');
    }

    // Determine next turn
    const nextTurn = team === 'red' ? 'black' : 'red';

    // Check if game is over
    const board = parseBoardString(resultingBoard, ruleset);
    const gameOverResult = isGameOver(board, ruleset);

    if (gameOverResult) {
      await updateGame(gameId, {
        status: gameOverResult.winner === 'draw' ? 'draw' : `${gameOverResult.winner}_wins`
      });
    }

    return {
      move,
      resultingBoard,
      nextTurn,
    };
  } catch (error) {
    if (error instanceof AiServiceError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new AiServiceError(`Failed to trigger AI turn: ${error.message}`);
    }
    throw new AiServiceError('Failed to trigger AI turn: unknown error');
  }
}
