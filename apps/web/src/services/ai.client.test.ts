import { test, expect, describe, mock } from "bun:test";
import { requestAiMove, triggerAiTurn } from './ai.client';
import { type RuleSet } from '@checkers/shared';

describe('AI Client', () => {
  const mockRuleset: RuleSet = {
    name: 'standard',
    boardSize: 8,
    startingLayout: 'standard',
    kingsCanMoveBackwards: true,
    maxConsecutiveJumps: 4,
    forceCapture: true,
    forceCaptureMax: true
  };

  const mockBoard = '-r-r-r-r#r-r-r-r#-r-r-r-r#--------#--------#b-b-b-b#-b-b-b-b#b-b-b-b-';

  describe('requestAiMove', () => {
    test('should validate inputs', async () => {
      // Test invalid team
      await expect(() =>
        requestAiMove('invalid' as any, 'easy', 'minimax', mockBoard, mockRuleset)
      ).toThrow('Invalid team: must be "red" or "black"');

      // Test invalid difficulty
      await expect(() =>
        requestAiMove('red', 'invalid' as any, 'minimax', mockBoard, mockRuleset)
      ).toThrow('Invalid difficulty: must be "easy", "medium", or "hard"');

      // Test invalid algorithm
      await expect(() =>
        requestAiMove('red', 'easy', 'invalid' as any, mockBoard, mockRuleset)
      ).toThrow('Invalid algorithm: must be "minimax" or "astar"');

      // Test invalid board
      await expect(() =>
        requestAiMove('red', 'easy', 'minimax', '' as any, mockRuleset)
      ).toThrow('Invalid board: must be a non-empty string');
    });

    test('should handle fetch errors', async () => {
      // Mock fetch to reject
      const originalFetch = global.fetch;
      global.fetch = mock(() => Promise.reject(new Error('Network error')));

      await expect(
        requestAiMove('red', 'easy', 'minimax', mockBoard, mockRuleset)
      ).rejects.toThrow('Failed to request AI move: Network error');

      global.fetch = originalFetch;
    });

    test('should handle non-ok responses', async () => {
      // Mock fetch to return non-ok response
      const originalFetch = global.fetch;
      global.fetch = mock(() => 
        Promise.resolve(new Response(JSON.stringify({ error: 'Service unavailable' }), { status: 503 }))
      );

      await expect(
        requestAiMove('red', 'easy', 'minimax', mockBoard, mockRuleset)
      ).rejects.toThrow('Service unavailable');

      global.fetch = originalFetch;
    });

    test('should handle invalid response structure', async () => {
      // Mock fetch to return invalid response
      const originalFetch = global.fetch;
      global.fetch = mock(() => 
        Promise.resolve(new Response(JSON.stringify({ invalid: 'response' }), { status: 200 }))
      );

      await expect(
        requestAiMove('red', 'easy', 'minimax', mockBoard, mockRuleset)
      ).rejects.toThrow('Invalid move coordinates in AI response');

      global.fetch = originalFetch;
    });

    test('should return valid move on success', async () => {
      // Mock fetch to return valid response
      const mockMove = {
        from: [2, 1],
        to: [3, 0],
        captures: [],
        promotion: false,
        resulting_board: mockBoard,
        algorithm: 'minimax'
      };

      const originalFetch = global.fetch;
      global.fetch = mock(() => 
        Promise.resolve(new Response(JSON.stringify(mockMove), { status: 200 }))
      );

      const result = await requestAiMove('red', 'easy', 'minimax', mockBoard, mockRuleset);

      expect(result.move).toEqual({
        from: [2, 1],
        to: [3, 0],
        captures: [],
        promotion: false
      });
      expect(result.resultingBoard).toBe(mockBoard);
      expect(result.algorithm).toBe('minimax');

      global.fetch = originalFetch;
    });
  });

  describe('triggerAiTurn', () => {
    test('should call requestAiMove and return next turn', async () => {
      // Mock requestAiMove
      const mockRequestAiMove = mock(() => Promise.resolve({
        move: {
          from: [2, 1],
          to: [3, 0],
          captures: [],
          promotion: false
        },
        resultingBoard: mockBoard,
        algorithm: 'minimax'
      }));

      // Mock fetch to return valid response
      const mockMove = {
        from: [2, 1],
        to: [3, 0],
        captures: [],
        promotion: false,
        resulting_board: mockBoard,
        algorithm: 'minimax'
      };

      const originalFetch = global.fetch;
      global.fetch = mock(() => 
        Promise.resolve(new Response(JSON.stringify(mockMove), { status: 200 }))
      );

      const result = await triggerAiTurn('game123', 'red', 'easy', 'minimax', mockBoard, mockRuleset);

      expect(result.move).toEqual({
        from: [2, 1],
        to: [3, 0],
        captures: [],
        promotion: false
      });
      expect(result.resultingBoard).toBe(mockBoard);
      expect(result.nextTurn).toBe('black');

      global.fetch = originalFetch;
    });

    test('should handle errors from requestAiMove', async () => {
      // Mock fetch to throw
      const originalFetch = global.fetch;
      global.fetch = mock(() => Promise.reject(new Error('AI service error')));

      await expect(
        triggerAiTurn('game123', 'red', 'easy', 'minimax', mockBoard, mockRuleset)
      ).rejects.toThrow('Failed to trigger AI turn: Failed to request AI move: AI service error');

      global.fetch = originalFetch;
    });
  });
});
