import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createGame, getGameById, addMoveToHistory } from '../src/models/game.service';
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
    const game = await createGame(ENGLISH, 'pva', 'hard', 'black');
    
    expect(game.mode).toBe('pva');
    expect(game.difficulty).toBe('hard');
    expect(game.ai_team).toBe('black');
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
      board_after: game.board, // Simplified for test
      timestamp: new Date(),
      ruleset: ENGLISH // This should be stripped
    };

    const updatedGame = await addMoveToHistory(gameId, moveWithRuleset);
    
    expect(updatedGame?.history).toHaveLength(1);
    const storedMove = updatedGame?.history[0];
    
    // Verify ruleset field was stripped
    expect(storedMove).not.toHaveProperty('ruleset');
    expect(storedMove?.from).toEqual([2, 1]);
    expect(storedMove?.to).toEqual([3, 2]);
    expect(updatedGame?.move_count).toBe(1);
  });

  it('should use ruleset.boardSize instead of board_size field', async () => {
    const game = await createGame(ENGLISH, 'pvp');
    
    // Verify board size is accessible through ruleset
    expect(game.ruleset.boardSize).toBe(8);
    expect(game.board.length).toBe(game.ruleset.boardSize * game.ruleset.boardSize);
    
    // Verify no board_size field exists
    expect(game).not.toHaveProperty('board_size');
  });
});