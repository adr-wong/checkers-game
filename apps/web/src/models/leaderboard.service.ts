import { LeaderboardEntry } from './leaderboard.model'

export async function upsertLeaderboard(
  userId: string,
  username: string,
  moves: number,
  gameId: string,
  difficulty: 'easy' | 'medium' | 'hard',
  ruleset: string,
  player_team: 'red' | 'black',
  algorithm: 'minimax' | 'astar',
  player_name?: string,
): Promise<void> {
  const filter = { userId, algorithm, ruleset, difficulty, player_team }
  const existing = await LeaderboardEntry.findOne(filter)
  if (!existing || moves < existing.bestMoves) {
    await LeaderboardEntry.findOneAndUpdate(
      filter,
      {
        userId,
        username,
        player_name,
        player_team,
        algorithm,
        turns: moves,
        bestMoves: moves,
        gameId,
        difficulty,
        ruleset,
        achievedAt: existing?.achievedAt ?? new Date(),
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    )
  }
}

export interface LeaderboardFilters {
  difficulty?: string
  ruleset?: string
  algorithm?: string
  player_team?: string
  limit?: number
  offset?: number
}

export async function getLeaderboard(filters: LeaderboardFilters = {}) {
  const query: Record<string, any> = {}
  if (filters.difficulty) query.difficulty = filters.difficulty
  if (filters.ruleset) query.ruleset = filters.ruleset
  if (filters.algorithm) query.algorithm = filters.algorithm
  if (filters.player_team) query.player_team = filters.player_team

  return LeaderboardEntry.find(query)
    .sort({ bestMoves: 1 })
    .skip(filters.offset ?? 0)
    .limit(filters.limit ?? 50)
    .lean()
}
