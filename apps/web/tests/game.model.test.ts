import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Game } from '../src/models/game.model';
import { ENGLISH, INTERNATIONAL } from '@checkers/shared';
import { buildStandardLayout } from '../src/models/game.service';

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

describe('Game Model', () => {
  
  it('should create a game with valid ruleset', async () => {
    const game = new Game({
      ruleset: ENGLISH,
      mode: 'pvp',
      board: 'r#r#r#r#r#r#r#r#-#-#-#-#-#-#-#r#r#r#r#r#r#r#r#-#-#-#-#-#-#-#b#b#b#b#b#b#b#b#-#-#-#-#-#-#-#b#b#b#b#b#b#b#b',
      turn: 'red',
      status: 'active',
      move_count: 0,
      history: []
    });

    const savedGame = await game.save();
    expect(savedGame._id).toBeDefined();
    expect(savedGame.ruleset.boardSize).toBe(8);
    expect(savedGame.mode).toBe('pvp');
  });

  it('should reject game with invalid ruleset', async () => {
    const invalidRuleset = {
      ...ENGLISH,
      boardSize: 12 // Invalid board size
    };

    const game = new Game({
      ruleset: invalidRuleset,
      mode: 'pvp',
      board: 'invalid',
      turn: 'red',
      status: 'active',
      move_count: 0,
      history: []
    });

    await expect(game.save()).rejects.toThrow();
  });

  it('should require ruleset field', async () => {
    const game = new Game({
      mode: 'pvp',
      board: 'r#r#r#r#r#r#r#r#-#-#-#-#-#-#-#-#r#r#r#r#r#r#r#r#-#-#-#-#-#-#-#b#b#b#b#b#b#b#b#-#-#-#-#-#-#-#b#b#b#b#b#b#b#b',
      turn: 'red',
      status: 'active',
      move_count: 0,
      history: []
    });

    await expect(game.save()).rejects.toThrow();
  });

  it('should accept international ruleset', async () => {
    const game = new Game({
      ruleset: INTERNATIONAL,
      mode: 'pva',
      difficulty: 'medium',
      ai_team: 'black',
      board: buildStandardLayout(INTERNATIONAL),
      turn: 'red',
      status: 'active',
      move_count: 0,
      history: []
    });

    const savedGame = await game.save();
    expect(savedGame.ruleset.boardSize).toBe(10);
    expect(savedGame.mode).toBe('pva');
    expect(savedGame.difficulty).toBe('medium');
  });

  it('should require difficulty and ai_team for AI modes', async () => {
    const game = new Game({
      ruleset: ENGLISH,
      mode: 'pva', // AI mode but missing difficulty and ai_team
      board: 'r#r#r#r#r#r#r#r#-#-#-#-#-#-#-#-#r#r#r#r#r#r#r#r#-#-#-#-#-#-#-#b#b#b#b#b#b#b#b#-#-#-#-#-#-#-#b#b#b#b#b#b#b#b',
      turn: 'red',
      status: 'active',
      move_count: 0,
      history: []
    });

    await expect(game.save()).rejects.toThrow();
  });
});

import { buildStandardLayout } from '../src/models/game.service';