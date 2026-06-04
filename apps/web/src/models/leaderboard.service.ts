import { LeaderboardEntry } from './leaderboard.model'

export async function upsertLeaderboard(
  userId: string,
  username: string,
  moves: number,
  gameId: string,
  difficulty: 'easy' | 'medium' | 'hard',
  ruleset: string,
): Promise<void> {
  const existing = await LeaderboardEntry.findOne({ userId })
  if (!existing || moves < existing.bestMoves) {
    await LeaderboardEntry.findOneAndUpdate(
      { userId },
      {
        userId,
        username,
        bestMoves: moves,
        gameId,
        difficulty,
        ruleset,
        achievedAt: new Date(),
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    )
  }
}

export async function getLeaderboard(limit = 20) {
  return LeaderboardEntry.find()
    .sort({ bestMoves: 1 })
    .limit(limit)
    .lean()
}