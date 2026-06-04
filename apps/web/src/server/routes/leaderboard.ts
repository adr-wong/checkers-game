import { Hono } from 'hono'
import { verifyToken, createClerkClient } from '@clerk/backend'
import { upsertLeaderboard, getLeaderboard } from '../../models/leaderboard.service'

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
const leaderboardRouter = new Hono()

leaderboardRouter.get('/', async (c) => {
  const entries = await getLeaderboard(20)
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
  const { gameId, moves, difficulty, ruleset } = body

  if (!gameId || typeof moves !== 'number' || !difficulty || !ruleset) {
    return c.json({ error: 'Invalid body' }, 400)
  }

  await upsertLeaderboard(userId, username, moves, gameId, difficulty, ruleset)
  return c.json({ ok: true })
})

export default leaderboardRouter