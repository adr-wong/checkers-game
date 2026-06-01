import { type Move, type RuleSet, parseBoardString, isGameOver } from '@checkers/shared';
import { addMoveToHistory, updateGame } from '../models/game.service';

const AI_SERVICE_BASE_URL = process.env.AI_SERVICE_URL || 'http://localhost:4000';
const AI_REQUEST_TIMEOUT_MS = parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '10000', 10);
const MAX_RETRIES = 3;
let _retryDelayMs = 1000;

export function setRetryDelayMs(ms: number) {
  _retryDelayMs = ms;
}

export class AiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiServiceError';
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(status: number): boolean {
  return status >= 500;
}

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

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `AI service returned status ${response.status}`;

        if (isRetryable(response.status) && attempt < MAX_RETRIES) {
          lastError = new AiServiceError(errorMessage);
          await delay(_retryDelayMs);
          continue;
        }

        throw new AiServiceError(errorMessage);
      }

      const data = await response.json();

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
      clearTimeout(timeoutId);

      if (error instanceof AiServiceError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new AiServiceError('AI service request timed out');
        if (attempt < MAX_RETRIES) {
          await delay(_retryDelayMs);
          continue;
        }
        throw lastError;
      }

      if (error instanceof Error) {
        lastError = new AiServiceError(`Failed to request AI move: ${error.message}`);
      } else {
        lastError = new AiServiceError('Failed to request AI move: unknown error');
      }

      if (attempt < MAX_RETRIES) {
        await delay(_retryDelayMs);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new AiServiceError('Failed to request AI move: unknown error');
}

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
    const { move, resultingBoard } = await requestAiMove(
      team,
      difficulty,
      algorithm,
      currentBoard,
      ruleset
    );

    const updatedGame = await addMoveToHistory(gameId, { ...move, ruleset }, resultingBoard);

    if (!updatedGame) {
      throw new AiServiceError('Failed to add AI move to history');
    }

    const nextTurn = team === 'red' ? 'black' : 'red';

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
