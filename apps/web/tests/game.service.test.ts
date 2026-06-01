import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createGame, getGameById, addMoveToHistory, updateGame } from '../src/models/game.service';
import { ENGLISH } from '@checkers/shared';

// Set up MongoDB Memory Server
let mongoServer: MongoMemoryServer;
let mongoUri: string;

beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Clean up
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear database between tests
  await mongoose.connection.db.dropDatabase();
});

describe('Game Service', () => {
  
  it('should create a PVP game', async () => {
    const game = await createGame(ENGLISH, 'pvp');
    
    expect(game).toBeDefined();
    expect(game._id).toBeDefined();
    expect(game.mode).toBe('pvp');
    expect(game.ruleset.boardSize).toBe(8);
    expect(game.board.length).toBe(64); // 8x8 board
    expect(game.turn).toBe('red');
    expect(game.status).toBe('active');
    expect(game.move_count).toBe(0);
    expect(game.history).toHaveLength(0);
  });

  it('should create a PVA game with AI settings', async () => {
    const game = await createGame(ENGLISH, 'pva', 'hard', 'black', 'minimax');
    
    expect(game.mode).toBe('pva');
    expect(game.difficulty).toBe('hard');
    expect(game.ai_team).toBe('black');
    expect(game.algorithm).toBe('minimax');
  });

  it('should reject invalid ruleset', async () => {
    const invalidRuleset = {
      ...ENGLISH,
      boardSize: 12 // Invalid
    };

    await expect(createGame(invalidRuleset, 'pvp'))
      .rejects
      .toThrow('Invalid ruleset');
  });

  it('should get game by ID', async () => {
    const createdGame = await createGame(ENGLISH, 'pvp');
    const gameId = createdGame._id.toString();
    
    const retrievedGame = await getGameById(gameId);
    expect(retrievedGame).toBeDefined();
    expect(retrievedGame?._id.toString()).toBe(gameId);
  });

  it('should add move to history and strip ruleset field', async () => {
    const game = await createGame(ENGLISH, 'pvp');
    const gameId = game._id.toString();
    
    // Create a move with ruleset field (as it would come from shared package)
    const moveWithRuleset = {
      from: [2, 1],
      to: [3, 2],
      captures: [],
      promotion: false,
      ruleset: ENGLISH // This should be stripped
    };

    const boardAfter = 'updated-board-string';
    const updatedGame = await addMoveToHistory(gameId, moveWithRuleset, boardAfter);
    
    expect(updatedGame?.history).toHaveLength(1);
    const storedMove = updatedGame?.history[0];
    
    // Verify ruleset field was stripped and metadata added
    expect(storedMove).not.toHaveProperty('ruleset');
    expect(storedMove?.from).toEqual([2, 1]);
    expect(storedMove?.to).toEqual([3, 2]);
    expect(storedMove?.board_after).toBe(boardAfter);
    expect(storedMove?.timestamp).toBeInstanceOf(Date);
    expect(updatedGame?.move_count).toBe(1);
    expect(updatedGame?.board).toBe(boardAfter);
    expect(updatedGame?.turn).toBe('black'); // Turn should flip from red
  });

  it('should use ruleset.boardSize instead of board_size field', async () => {
    const game = await createGame(ENGLISH, 'pvp');
    
    // Verify board size is accessible through ruleset
    expect(game.ruleset.boardSize).toBe(8);
    expect(game.board.length).toBe(game.ruleset.boardSize * game.ruleset.boardSize);
    
    // Verify no board_size field exists
    expect(game).not.toHaveProperty('board_size');
  });

  it('should return null for nonexistent game ID', async () => {
    const nonexistentId = '507f1f77bcf86cd799439011'; // Valid ObjectId format
    const result = await getGameById(nonexistentId);
    expect(result).toBeNull();
  });

  it('should update updated_at field after game update', async () => {
    const game = await createGame(ENGLISH, 'pvp');
    const gameId = game._id.toString();
    
    const originalUpdatedAt = game.updated_at;
    
    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const updatedGame = await updateGame(gameId, { status: 'red_wins' });
    
    expect(updatedGame?.updated_at).not.toBe(originalUpdatedAt);
    expect(updatedGame?.status).toBe('red_wins');
  });

  it('should increment move_count across multiple moves', async () => {
    const game = await createGame(ENGLISH, 'pvp');
    const gameId = game._id.toString();
    
    expect(game.move_count).toBe(0);
    
    // First move
    const move1 = {
      from: [2, 1],
      to: [3, 2],
      captures: [],
      promotion: false,
      ruleset: ENGLISH
    };
    
    const afterMove1 = await addMoveToHistory(gameId, move1, 'board-after-move-1');
    expect(afterMove1?.move_count).toBe(1);
    
    // Second move
    const move2 = {
      from: [5, 0],
      to: [4, 1],
      captures: [],
      promotion: false,
      ruleset: ENGLISH
    };
    
    const afterMove2 = await addMoveToHistory(gameId, move2, 'board-after-move-2');
    expect(afterMove2?.move_count).toBe(2);
    expect(afterMove2?.history).toHaveLength(2);
  });
});