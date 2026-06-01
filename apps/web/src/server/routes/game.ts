import { Hono } from 'hono'
import { z } from 'zod'
import { createGame, getGameById, updateGame, addMoveToHistory } from '../../models/game.service'
import { type RuleSet, type Move, PRESET_RULESETS } from '@checkers/shared'
import { getLegalMoves, applyMove, isGameOver, parseBoardString, serializeBoardString } from '@checkers/shared'

// Create game router
const gameRouter = new Hono()

// Zod schemas for validation
const createGameSchema = z.object({
  ruleset: z.union([
    z.object({ preset: z.enum(['english', 'international', 'brazilian', 'russian', 'pool']) }),
    z.custom<RuleSet>()
  ]),
  mode: z.enum(['pvp', 'pva', 'ava']),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  ai_team: z.enum(['red', 'black']).optional(),
  algorithm: z.enum(['minimax', 'astar']).optional()
})

const moveSchema = z.object({
  from: z.tuple([z.number(), z.number()]),
  to: z.tuple([z.number(), z.number()]),
  captures: z.array(z.tuple([z.number(), z.number()])),
  promotion: z.boolean()
})

// POST / - Create a new game
gameRouter.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const validation = createGameSchema.safeParse(body)
    
    if (!validation.success) {
      return c.json({ error: 'Invalid request body', details: validation.error.errors }, 400)
    }
    
    const { ruleset, mode, difficulty, ai_team, algorithm } = validation.data

    // Convert preset to full ruleset if needed
    let fullRuleset: RuleSet
    if ('preset' in ruleset) {
      fullRuleset = PRESET_RULESETS[ruleset.preset]
    } else {
      fullRuleset = ruleset
    }

    const game = await createGame(fullRuleset, mode, difficulty, ai_team, algorithm)
    
    return c.json({
      gameId: game._id,
      status: 'created',
      ruleset: game.ruleset,
      mode: game.mode,
      turn: game.turn
    }, 201)
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400)
    }
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /:gameId/state - Get current game state
gameRouter.get('/:gameId/state', async (c) => {
  try {
    const gameId = c.req.param('gameId')
    
    // Validate gameId format first
    if (!gameId || gameId.length !== 24) {
      return c.json({ error: 'Invalid game ID format' }, 400)
    }
    
    const game = await getGameById(gameId)
    
    if (!game) {
      return c.json({ error: 'Game not found' }, 404)
    }
    
    return c.json({
      ruleset: game.ruleset,
      mode: game.mode,
      board: game.board,
      turn: game.turn,
      status: game.status,
      move_count: game.move_count,
      created_at: game.created_at,
      updated_at: game.updated_at
    })
  } catch (error) {
    console.error('Error in get game state:', error)
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return c.json({ error: 'Invalid game ID format' }, 400)
    }
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /:gameId/legal - Get all legal moves for current player
gameRouter.get('/:gameId/legal', async (c) => {
  try {
    const gameId = c.req.param('gameId')
    const game = await getGameById(gameId)
    
    if (!game) {
      return c.json({ error: 'Game not found' }, 404)
    }
    
    const board = parseBoardString(game.board, game.ruleset)
    const legalMoves = getLegalMoves(board, game.ruleset, game.turn)
    
    return c.json({
      turn: game.turn,
      legal_moves: legalMoves
    })
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400)
    }
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /:gameId/move - Make a move
gameRouter.post('/:gameId/move', async (c) => {
  try {
    const gameId = c.req.param('gameId')
    const game = await getGameById(gameId)
    
    if (!game) {
      return c.json({ error: 'Game not found' }, 404)
    }
    
    if (game.status !== 'active') {
      return c.json({ error: 'Game is already over' }, 400)
    }
    
    const body = await c.req.json()
    const validation = moveSchema.safeParse(body)
    
    if (!validation.success) {
      return c.json({ error: 'Invalid move format', details: validation.error.errors }, 400)
    }
    
    const move = validation.data
    
    // Validate it's the correct player's turn
    const board = parseBoardString(game.board, game.ruleset)
    const fromCell = board[move.from[0]][move.from[1]]
    
    if (!fromCell.piece || fromCell.piece.team !== game.turn) {
      return c.json({ error: 'It is not your turn to move this piece' }, 400)
    }
    
    // Validate the move is legal
    const legalMoves = getLegalMoves(board, game.ruleset, game.turn)
    const isLegalMove = legalMoves.some(m => 
      m.from[0] === move.from[0] && 
      m.from[1] === move.from[1] &&
      m.to[0] === move.to[0] && 
      m.to[1] === move.to[1]
    )
    
    if (!isLegalMove) {
      return c.json({ error: 'Illegal move' }, 400)
    }
    
    // Apply the move
    const moveWithRuleset: Move = {
      ...move,
      ruleset: game.ruleset
    }
    
    const newBoard = applyMove(board, moveWithRuleset, game.ruleset)
    const boardAfter = serializeBoardString(newBoard, game.ruleset)
    
    // Update game state
    const updatedGame = await addMoveToHistory(gameId, moveWithRuleset, boardAfter)
    
    if (!updatedGame) {
      return c.json({ error: 'Failed to update game' }, 500)
    }
    
    // Check if game is over
    const gameOverResult = isGameOver(newBoard, game.ruleset)
    if (gameOverResult) {
      const statusUpdate = await updateGame(gameId, {
        status: gameOverResult.winner === 'draw' ? 'draw' : `${gameOverResult.winner}_wins`
      })
      
      if (!statusUpdate) {
        return c.json({ error: 'Failed to update game status' }, 500)
      }
    }
    
    return c.json({
      status: 'success',
      board: boardAfter,
      turn: updatedGame.turn,
      move_count: updatedGame.move_count,
      game_over: gameOverResult ? {
        winner: gameOverResult.winner
      } : null
    })
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400)
    }
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /:gameId/resign - Resign from the game
gameRouter.post('/:gameId/resign', async (c) => {
  try {
    const gameId = c.req.param('gameId')
    const game = await getGameById(gameId)
    
    if (!game) {
      return c.json({ error: 'Game not found' }, 404)
    }
    
    if (game.status !== 'active') {
      return c.json({ error: 'Game is already over' }, 400)
    }
    
    const body = await c.req.json()
    const { player } = body
    
    if (!player || (player !== 'red' && player !== 'black')) {
      return c.json({ error: 'Invalid player' }, 400)
    }
    
    // Determine winner (opposite of resigning player)
    const winner = player === 'red' ? 'black' : 'red'
    
    const updatedGame = await updateGame(gameId, {
      status: `${winner}_wins`
    })
    
    if (!updatedGame) {
      return c.json({ error: 'Failed to update game' }, 500)
    }
    
    return c.json({
      status: 'success',
      winner: winner,
      game_status: updatedGame.status
    })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default gameRouter