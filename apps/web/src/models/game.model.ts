import mongoose, { Schema, Document } from 'mongoose';
import { validateRuleSet, type RuleSet, type GameStyleConfig, DEFAULT_STYLE_CONFIG } from '@checkers/shared';

// Define the Move schema for history entries
const MoveSchema = new Schema({
  from: { type: [Number], required: true },
  to: { type: [Number], required: true },
  captures: { type: [[Number]], required: true },
  promotion: { type: Boolean, required: true },
  board_after: { type: String, required: true },
  timestamp: { type: Date, required: true }
}, { _id: false });

// Define the Game schema
const GameSchema = new Schema({
  ruleset: {
    type: Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function(ruleset: RuleSet) {
        const errors = validateRuleSet(ruleset);
        return errors.length === 0;
      },
      message: 'Invalid ruleset configuration'
    }
  },
  mode: {
    type: String,
    enum: ['pvp', 'pva', 'ava'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: function(this: { mode: string }) {
      return this.mode !== 'pvp';
    }
  },
  ai_team: {
    type: String,
    enum: ['red', 'black'],
    required: function(this: { mode: string }) {
      return this.mode !== 'pvp';
    }
  },
  algorithm: {
    type: String,
    enum: ['minimax', 'astar'],
    required: function(this: { mode: string }) {
      return this.mode !== 'pvp';
    }
  },
  board: {
    type: String,
    required: true
  },
  turn: {
    type: String,
    enum: ['red', 'black'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'red_wins', 'black_wins', 'draw'],
    required: true,
    default: 'active'
  },
  move_count: {
    type: Number,
    required: true,
    default: 0
  },
  history: {
    type: [MoveSchema],
    required: true,
    default: []
  },
  styleConfig: {
    type: Schema.Types.Mixed,
    required: true,
    default: DEFAULT_STYLE_CONFIG
  },
  created_at: {
    type: Date,
    required: true,
    default: Date.now
  },
  updated_at: {
    type: Date,
    required: true,
    default: Date.now
  }
});

// Update the updated_at field before saving
GameSchema.pre('save', function(next) {
  this.updated_at = new Date();
  if (typeof next === 'function') {
    next();
  }
});

// Create the Game model
export const Game = mongoose.model<IGame>('Game', GameSchema);

// TypeScript interface for Game document
export interface IGame extends Document {
  ruleset: RuleSet;
  mode: 'pvp' | 'pva' | 'ava';
  difficulty?: 'easy' | 'medium' | 'hard';
  ai_team?: 'red' | 'black';
  algorithm?: 'minimax' | 'astar';
  board: string;
  turn: 'red' | 'black';
  status: 'active' | 'red_wins' | 'black_wins' | 'draw';
  move_count: number;
  history: Array<{
    from: [number, number];
    to: [number, number];
    captures: [number, number][];
    promotion: boolean;
    board_after: string;
    timestamp: Date;
  }>;
  styleConfig: GameStyleConfig;
  created_at: Date;
  updated_at: Date;
}