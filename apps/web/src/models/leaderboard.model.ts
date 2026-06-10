import mongoose, { Schema, Document } from 'mongoose'

export interface ILeaderboardEntry extends Document {
  userId: string
  username: string
  player_name?: string
  player_team: 'red' | 'black'
  algorithm: 'minimax' | 'astar'
  turns: number
  bestMoves: number
  gameId: string
  difficulty: 'easy' | 'medium' | 'hard'
  ruleset: string
  achievedAt: Date
  updatedAt: Date
}

const LeaderboardSchema = new Schema({
  userId:      { type: String, required: true },
  username:    { type: String, required: true },
  player_name: { type: String, required: false },
  player_team: { type: String, enum: ['red', 'black'], required: true },
  algorithm:   { type: String, enum: ['minimax', 'astar'], required: true },
  turns:       { type: Number, required: true },
  bestMoves:   { type: Number, required: true },
  gameId:      { type: String, required: true },
  difficulty:  { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  ruleset:     { type: String, required: true },
  achievedAt:  { type: Date, required: true, default: Date.now },
  updatedAt:   { type: Date, required: true, default: Date.now },
})

LeaderboardSchema.index(
  { userId: 1, algorithm: 1, ruleset: 1, difficulty: 1, player_team: 1 },
  { unique: true }
)
LeaderboardSchema.index({ bestMoves: 1 })

export const LeaderboardEntry = mongoose.model<ILeaderboardEntry>(
  'LeaderboardEntry',
  LeaderboardSchema
)