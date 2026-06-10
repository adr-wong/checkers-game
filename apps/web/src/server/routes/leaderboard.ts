import { Hono } from 'hono'
import { verifyToken, createClerkClient } from '@clerk/backend'
import { upsertLeaderboard, getLeaderboard } from '../../models/leaderboard.service'

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
const leaderboardRouter = new Hono()

leaderboardRouter.get('/', async (c) => {
  const query = c.req.query()
  const entries = await getLeaderboard({
    difficulty: query.difficulty || undefined,
    ruleset: query.ruleset || undefined,
    algorithm: query.algorithm || undefined,
    player_team: query.player_team || undefined,
    limit: query.limit ? parseInt(query.limit) : 50,
    offset: query.offset ? parseInt(query.offset) : 0,
  })
  return c.json({ entries })
})

leaderboardRouter.post('/', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice(7)
  let userId: string
  let username: string

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    })
    userId = payload.sub

    const user = await clerk.users.getUser(userId)
    const nameFromParts = ((user.firstName ?? '') + ' ' + (user.lastName ?? '')).trim()
    username = user.username ?? nameFromParts ?? user.emailAddresses[0]?.emailAddress ?? userId
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }

  const body = await c.req.json()
  const { gameId, moves, difficulty, ruleset, player_team, algorithm, player_name } = body

  if (!gameId || typeof moves !== 'number' || !difficulty || !ruleset || !player_team || !algorithm) {
    return c.json({ error: 'Invalid body' }, 400)
  }

  await upsertLeaderboard(userId, username, moves, gameId, difficulty, ruleset, player_team, algorithm, player_name)
  return c.json({ ok: true })
})

export default leaderboardRouter
