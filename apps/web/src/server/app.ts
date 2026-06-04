import { Hono } from 'hono'
import { corsMiddleware, loggingMiddleware, errorHandlingMiddleware } from './middleware'
import gameRouter from './routes/game'
import leaderboardRouter from './routes/leaderboard'

// Create the Hono app
const app = new Hono()

// Middleware
app.use('*', corsMiddleware)
app.use('*', loggingMiddleware)
app.use('*', errorHandlingMiddleware)

// Health check endpoint
app.get('/', (c) => {
  return c.json({ status: 'ok', message: 'Checkers API is running' })
})

// Game routes
app.route('/api/game', gameRouter)

// Leaderboard routes
app.route('/api/leaderboard', leaderboardRouter)

// Not found handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404)
})

export { app as default, app }
