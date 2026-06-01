import { test, expect, describe, mock, afterEach, spyOn } from "bun:test";
import { requestAiMove, AiServiceError, setRetryDelayMs } from './ai.client';
import { ENGLISH, type RuleSet } from '@checkers/shared';

const mockRuleset: RuleSet = ENGLISH;

const mockBoard = '-r-r-r-r#r-r-r-r#-r-r-r-r#--------#--------#b-b-b-b#-b-b-b-b#b-b-b-b-';

describe('AI Client', () => {

  afterEach(() => {
    setRetryDelayMs(1000);
  });

  describe('requestAiMove', () => {
    test('should validate inputs', async () => {
      await expect(
        requestAiMove('invalid' as any, 'easy', 'minimax', mockBoard, mockRuleset)
      ).rejects.toThrow('Invalid team: must be "red" or "black"');

      await expect(
        requestAiMove('red', 'invalid' as any, 'minimax', mockBoard, mockRuleset)
      ).rejects.toThrow('Invalid difficulty: must be "easy", "medium", or "hard"');

      await expect(
        requestAiMove('red', 'easy', 'invalid' as any, mockBoard, mockRuleset)
      ).rejects.toThrow('Invalid algorithm: must be "minimax" or "astar"');

      await expect(
        requestAiMove('red', 'easy', 'minimax', '' as any, mockRuleset)
      ).rejects.toThrow('Invalid board: must be a non-empty string');
    });

    test('should handle fetch errors', async () => {
      setRetryDelayMs(0);
      const spy = spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      );

      await expect(
        requestAiMove('red', 'easy', 'minimax', mockBoard, mockRuleset)
      ).rejects.toThrow('Failed to request AI move: Network error');

      spy.mockRestore();
    });

    test('should handle non-ok responses', async () => {
      setRetryDelayMs(0);
      const spy = spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ error: 'Service unavailable' }), { status: 503 }))
      );

      await expect(
        requestAiMove('red', 'easy', 'minimax', mockBoard, mockRuleset)
      ).rejects.toThrow('Service unavailable');

      spy.mockRestore();
    });

    test('should not retry on 4xx responses', async () => {
      let callCount = 0;
      setRetryDelayMs(0);
      const spy = spyOn(globalThis, 'fetch').mockImplementation(() => {
        callCount++;
        return Promise.resolve(new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 }));
      });

      await expect(
        requestAiMove('red', 'easy', 'minimax', mockBoard, mockRuleset)
      ).rejects.toThrow('Bad request');

      expect(callCount).toBe(1);
      spy.mockRestore();
    });

    test('should retry on 5xx responses', async () => {
      let callCount = 0;
      setRetryDelayMs(0);
      const spy = spyOn(globalThis, 'fetch').mockImplementation(() => {
        callCount++;
        return Promise.resolve(new Response(JSON.stringify({ error: 'Server error' }), { status: 500 }));
      });

      await expect(
        requestAiMove('red', 'easy', 'minimax', mockBoard, mockRuleset)
      ).rejects.toThrow('Server error');

      expect(callCount).toBe(3);
      spy.mockRestore();
    });

    test('should handle invalid response structure', async () => {
      const spy = spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ invalid: 'response' }), { status: 200 }))
      );

      await expect(
        requestAiMove('red', 'easy', 'minimax', mockBoard, mockRuleset)
      ).rejects.toThrow('Invalid move coordinates in AI response');

      spy.mockRestore();
    });

    test('should return valid move on success', async () => {
      const mockMove = {
        from: [2, 1],
        to: [3, 0],
        captures: [],
        promotion: false,
        resulting_board: mockBoard,
        algorithm: 'minimax'
      };

      const spy = spyOn(globalThis, 'fetch').mockImplementation(() =>
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

      spy.mockRestore();
    });
  });

  describe('AiServiceError', () => {
    test('should be an instance of Error', () => {
      const error = new AiServiceError('test error');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('AiServiceError');
      expect(error.message).toBe('test error');
    });
  });
});
