import mongoose, { Schema, Document } from 'mongoose'

export interface ILeaderboardEntry extends Document {
  userId: string
  username: string
  bestMoves: number
  gameId: string
  difficulty: 'easy' | 'medium' | 'hard'
  ruleset: string
  achievedAt: Date
  updatedAt: Date
}

const LeaderboardSchema = new Schema({
  userId:     { type: String, required: true, unique: true },
  username:   { type: String, required: true },
  bestMoves:  { type: Number, required: true },
  gameId:     { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  ruleset:    { type: String, required: true },
  achievedAt: { type: Date, required: true, default: Date.now },
  updatedAt:  { type: Date, required: true, default: Date.now },
})

LeaderboardSchema.index({ bestMoves: 1 })

export const LeaderboardEntry = mongoose.model<ILeaderboardEntry>(
  'LeaderboardEntry',
  LeaderboardSchema
)