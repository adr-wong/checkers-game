import { Hono } from 'hono'
import { z } from 'zod'
import mongoose from 'mongoose'
import { createGame, getGameById, addMoveToHistory, updateGame } from '../../models/game.service'
import { triggerAiTurn, AiServiceError } from '../../services/ai.client'
import { type RuleSet, type Move, type GameStatus, PRESET_RULESETS } from '@checkers/shared'
import { getLegalMoves, applyMove, isGameOver, parseBoardString, serializeBoardString } from '@checkers/shared'

function isValidGameId(gameId: string): boolean {
  return mongoose.Types.ObjectId.isValid(gameId)
}

// Response types
type GameStateResponse = {
  gameId: string
  board: string
  ruleset: RuleSet
  turn: 'red' | 'black'
  status: GameStatus
  mode: 'pvp' | 'pva' | 'ava'
  difficulty?: 'easy' | 'medium' | 'hard'
  ai_team?: 'red' | 'black'
  algorithm?: 'minimax' | 'astar'
  move_count: number
}

type MoveResponse = {
  from: [number, number]
  to: [number, number]
  captures: [number, number][]
  promotion: boolean
}

// Helper to build game state response
function buildGameStateResponse(game: {
  _id: string | { toString(): string }
  board: string
  ruleset: RuleSet
  turn: 'red' | 'black'
  status: GameStatus
  mode: 'pvp' | 'pva' | 'ava'
  difficulty?: 'easy' | 'medium' | 'hard'
  ai_team?: 'red' | 'black'
  algorithm?: 'minimax' | 'astar'
  move_count: number
}): GameStateResponse {
  return {
    gameId: typeof game._id === 'string' ? game._id : game._id.toString(),
    board: game.board,
    ruleset: game.ruleset,
    turn: game.turn,
    status: game.status,
    mode: game.mode,
    difficulty: game.difficulty,
    ai_team: game.ai_team,
    algorithm: game.algorithm,
    move_count: game.move_count
  }
}

async function maybeTriggerNextAiMove(game: {
  _id: string | { toString(): string }
  mode: 'pvp' | 'pva' | 'ava'
  status: string
  move_count: number
  turn: 'red' | 'black'
  difficulty?: 'easy' | 'medium' | 'hard'
  algorithm?: 'minimax' | 'astar'
  board: string
  ruleset: RuleSet
}) {
  if (game.mode !== 'ava' || game.status !== 'active' || game.move_count === 0) {
    return
  }

  try {
    await triggerAiTurn(
      typeof game._id === 'string' ? game._id : game._id.toString(),
      game.turn,
      game.difficulty as 'easy' | 'medium' | 'hard',
      game.algorithm as 'minimax' | 'astar',
      game.board,
      game.ruleset
    )
  } catch (error) {
    console.error('Failed to trigger next AI move:', error)
  }
}

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

const positionQuerySchema = z.object({
  row: z.coerce.number().int(),
  col: z.coerce.number().int()
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

    // For ava mode, trigger the first AI move for red team (red always moves first)
    if (mode === 'ava') {
      try {
        await triggerAiTurn(
          game._id.toString(),
          'red',
          difficulty as 'easy' | 'medium' | 'hard',
          algorithm as 'minimax' | 'astar',
          game.board,
          game.ruleset
        )
      } catch (error) {
        // Continue - AI failure will be handled on client polling
        console.error('Failed to trigger initial AI move:', error)
      }
    }

    return c.json({
      gameId: game._id,
      state: buildGameStateResponse(game)
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
    
    if (!gameId || !isValidGameId(gameId)) {
      return c.json({ error: 'Invalid game ID format' }, 400)
    }
    
    const game = await getGameById(gameId)
    
    if (!game) {
      return c.json({ error: 'Game not found' }, 404)
    }
    
    await maybeTriggerNextAiMove(game)
    
    return c.json(buildGameStateResponse(game))
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

    if (!gameId || !isValidGameId(gameId)) {
      return c.json({ error: 'Invalid game ID format' }, 400)
    }

    const game = await getGameById(gameId)

    if (!game) {
      return c.json({ error: 'Game not found' }, 404)
    }

    const board = parseBoardString(game.board, game.ruleset)
    const allLegalMoves = getLegalMoves(board, game.ruleset, game.turn)

    // Validate and extract query parameters
    const queryParams = c.req.query()
    const queryValidation = positionQuerySchema.safeParse(queryParams)

    if (!queryValidation.success) {
      return c.json({ error: 'Invalid query parameters: row and col are required integers' }, 400)
    }

    const { row, col } = queryValidation.data

    // Validate the cell belongs to the current player
    if (row < 0 || row >= board.length || col < 0 || col >= board[0]?.length) {
      return c.json({ error: 'Position out of bounds' }, 400)
    }

    const cell = board[row][col]
    if (!cell.piece) {
      return c.json({ error: 'No piece at specified position' }, 400)
    }

    if (cell.piece.team !== game.turn) {
      return c.json({ error: 'It is not your turn to move this piece' }, 400)
    }

    // Filter legal moves to only those from the specified position
    const legalMoves = allLegalMoves.filter(m => m.from[0] === row && m.from[1] === col)

    return c.json({
      turn: game.turn,
      legal_moves: legalMoves
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return c.json({ error: 'Invalid game ID format' }, 400)
    }
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

    if (!gameId || !isValidGameId(gameId)) {
      return c.json({ error: 'Invalid game ID format' }, 400)
    }

    const game = await getGameById(gameId)
    
    if (!game) {
      return c.json({ error: 'Game not found' }, 404)
    }
    
    if (game.status !== 'active') {
      return c.json({ error: 'Game is already over' }, 409)
    }

    // For pva mode, check if it's the AI's turn
    if (game.mode === 'pva' && game.ai_team === game.turn) {
      return c.json({ error: "It is the AI's turn" }, 409)
    }

    // For ava mode, no human moves are allowed
    if (game.mode === 'ava') {
      return c.json({ error: 'AI vs AI games cannot be played manually' }, 403)
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
      return c.json({ error: 'Illegal move' }, 422)
    }
    
    // Apply the move
    const moveWithRuleset: Move = {
      ...move,
      ruleset: game.ruleset
    }
    
    const newBoard = applyMove(board, moveWithRuleset, game.ruleset)
    const boardAfter = serializeBoardString(newBoard, game.ruleset)
    
    // Save player move to history
    const updatedGame = await addMoveToHistory(gameId, moveWithRuleset, boardAfter)
    
    if (!updatedGame) {
      return c.json({ error: 'Failed to update game' }, 500)
    }
    
    // Check if game is over after player move
    const gameOverResult = isGameOver(newBoard, game.ruleset)
    if (gameOverResult) {
      const finalGame = await updateGame(gameId, {
        status: gameOverResult.winner === 'draw' ? 'draw' : `${gameOverResult.winner}_wins`
      })
      const moveResponse: MoveResponse = {
        from: move.from,
        to: move.to,
        captures: move.captures as [number, number][],
        promotion: move.promotion
      }
      return c.json({
        move: moveResponse,
        state: finalGame ? buildGameStateResponse(finalGame) : buildGameStateResponse(updatedGame)
      })
    }

    // Check if mode is pva and it's now AI's turn
    const nextTurn = updatedGame.turn
    if (game.mode === 'pva' && game.ai_team === nextTurn) {
      try {
        const aiResult = await triggerAiTurn(
          gameId,
          nextTurn,
          game.difficulty as 'easy' | 'medium' | 'hard',
          game.algorithm as 'minimax' | 'astar',
          boardAfter,
          game.ruleset
        )

        const playerMoveResponse: MoveResponse = {
          from: move.from,
          to: move.to,
          captures: move.captures as [number, number][],
          promotion: move.promotion
        }

        // Get updated game state after AI move
        const gameAfterAi = await getGameById(gameId)

        await maybeTriggerNextAiMove(gameAfterAi || updatedGame)

        return c.json({
          move: playerMoveResponse,
          state: gameAfterAi ? buildGameStateResponse(gameAfterAi) : buildGameStateResponse(updatedGame)
        })
      } catch (error) {
        if (error instanceof AiServiceError) {
          return c.json({ error: 'AI service unavailable', details: error.message }, 503)
        }
        throw error
      }
    }

    const playerMoveResponse: MoveResponse = {
      from: move.from,
      to: move.to,
      captures: move.captures as [number, number][],
      promotion: move.promotion
    }

    return c.json({
      move: playerMoveResponse,
      state: buildGameStateResponse(updatedGame)
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

    if (!gameId || !isValidGameId(gameId)) {
      return c.json({ error: 'Invalid game ID format' }, 400)
    }

    const game = await getGameById(gameId)
    
    if (!game) {
      return c.json({ error: 'Game not found' }, 404)
    }
    
    if (game.status !== 'active') {
      return c.json({ error: 'Game is already over' }, 409)
    }
    
const body = await c.req.json()
    const { team } = body

    if (!team || (team !== 'red' && team !== 'black')) {
      return c.json({ error: 'Invalid team' }, 400)
    }

    // Determine winner (opposite of resigning player)
    const winner = team === 'red' ? 'black' : 'red'
    
    const updatedGame = await updateGame(gameId, {
      status: `${winner}_wins`
    })
    
    if (!updatedGame) {
      return c.json({ error: 'Failed to update game' }, 500)
    }
    
    return c.json({
      state: buildGameStateResponse(updatedGame)
    })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default gameRouter