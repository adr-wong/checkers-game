import { test, expect, describe, beforeAll, afterAll, beforeEach, afterEach, mock } from "bun:test"
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import app from '../../src/server/app'
import { Game } from '../../src/models/game.model'
import { PRESET_RULESETS } from '@checkers/shared'

// Mock the AI client
mock.module('../../src/services/ai.client', () => ({
  requestAiMove: mock(() => Promise.resolve({
    move: { from: [2, 1], to: [3, 0], captures: [], promotion: false },
    resultingBoard: '-r-r-r-r#r-r-r-r#-r-r-r-r#--------#--------#b-b-b-b#-b-b-b-b#b-b-b-b-',
    algorithm: 'minimax'
  })),
  triggerAiTurn: mock(() => Promise.resolve({
    move: { from: [2, 1], to: [3, 0], captures: [], promotion: false },
    resultingBoard: '-r-r-r-r#r-r-r-r#-r-r-r-r#--------#--------#b-b-b-b#-b-b-b-b#b-b-b-b-',
    algorithm: 'minimax'
  })),
  AiServiceError: class AiServiceError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'AiServiceError'
    }
  }
}))

let mongoServer: MongoMemoryServer
let mongoUri: string

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  mongoUri = mongoServer.getUri()
  
  // Connect to the in-memory MongoDB
  await mongoose.connect(mongoUri)
})

afterAll(async () => {
  // Clean up
  await mongoose.disconnect()
  await mongoServer.stop()
})

beforeEach(async () => {
  // Clear the database before each test
  await Game.deleteMany({})
})

describe('Game API', () => {
  describe('POST /api/game', () => {
    test('should create a new game with preset ruleset', async () => {
      const response = await app.request('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleset: { preset: 'english' },
          mode: 'pvp'
        })
      })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data).toHaveProperty('gameId')
      expect(data.state).toHaveProperty('status')
      expect(data.state.status).toBe('active')
      expect(data.state.ruleset).toEqual(PRESET_RULESETS.english)
      expect(data.state.mode).toBe('pvp')
      expect(data.state.turn).toBe('red')
    })

    test('should create a new game with custom ruleset', async () => {
      const customRuleset = {
        name: 'Custom Rules',
        boardSize: 8,
        normalMoveDirections: 'forward',
        kingMoveDistance: 'flying',
        captureRequired: true,
        captureMaximum: false,
        captureBackward: false,
        promotionEndsJump: true,
        startingLayout: 'standard'
      }

      const response = await app.request('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleset: customRuleset,
          mode: 'pva',
          difficulty: 'medium',
          ai_team: 'black',
          algorithm: 'minimax'
        })
      })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data).toHaveProperty('gameId')
      expect(data.state).toHaveProperty('status')
      expect(data.state.status).toBe('active')
      expect(data.state.ruleset).toEqual(customRuleset)
      expect(data.state.mode).toBe('pva')
      expect(data.state.turn).toBe('red')
    })

    test('should return 400 for invalid request body', async () => {
      const response = await app.request('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    test('should return 400 for invalid ruleset', async () => {
      const response = await app.request('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleset: { preset: 'invalid' },
          mode: 'pvp'
        })
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })
  })

  describe('GET /api/game/:gameId/state', () => {
    test('should return game state for valid game', async () => {
      // First create a game
      const createResponse = await app.request('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleset: { preset: 'english' },
          mode: 'pvp'
        })
      })

      const createData = await createResponse.json()
      const gameId = createData.gameId

      // Now get the game state
      const response = await app.request(`/api/game/${gameId}/state`)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('ruleset')
      expect(data).toHaveProperty('mode')
      expect(data).toHaveProperty('board')
      expect(data).toHaveProperty('turn')
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('move_count')
    })

    test('should return 404 for non-existent game', async () => {
      const fakeGameId = '000000000000000000000000'
      const response = await app.request(`/api/game/${fakeGameId}/state`)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Game not found')
    })

    test('should return 400 for invalid game ID format', async () => {
      const invalidGameId = 'invalid-id'
      const response = await app.request(`/api/game/${invalidGameId}/state`)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid game ID format')
    })
  })

  describe('GET /api/game/:gameId/legal', () => {
    test('should return legal moves for current player', async () => {
      // Create a game
      const createResponse = await app.request('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleset: { preset: 'english' },
          mode: 'pvp'
        })
      })

      const createData = await createResponse.json()
      const gameId = createData.gameId

      // Get legal moves
      const response = await app.request(`/api/game/${gameId}/legal?row=2&col=1`)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('turn')
      expect(data).toHaveProperty('legal_moves')
      expect(Array.isArray(data.legal_moves)).toBe(true)
      expect(data.turn).toBe('red') // Red goes first
    })

    test('should return 404 for non-existent game', async () => {
      const fakeGameId = '000000000000000000000000'
      const response = await app.request(`/api/game/${fakeGameId}/legal`)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Game not found')
    })
  })

  describe('POST /api/game/:gameId/move', () => {
    test('should make a valid move and update game state', async () => {
      // Create a game
      const createResponse = await app.request('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleset: { preset: 'english' },
          mode: 'pvp'
        })
      })

      const createData = await createResponse.json()
      const gameId = createData.gameId

      // Get legal moves to find a valid move
      const legalResponse = await app.request(`/api/game/${gameId}/legal?row=2&col=1`)
      const legalData = await legalResponse.json()

      if (legalData.legal_moves.length === 0) {
        test.skip('No legal moves available for this game state')
        return
      }

      const validMove = legalData.legal_moves[0]

      // Make the move
      const moveResponse = await app.request(`/api/game/${gameId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: validMove.from,
          to: validMove.to,
          captures: validMove.captures || [],
          promotion: validMove.promotion || false
        })
      })

      expect(moveResponse.status).toBe(200)
      const moveData = await moveResponse.json()
      expect(moveData.state).toBeDefined()
      expect(moveData.state.status).toBe('active')
      expect(moveData.state.board).toBeDefined()
      expect(moveData.state.turn).toBeDefined()
      expect(moveData.state.move_count).toBeDefined()
    })

    test('should return 404 for non-existent game', async () => {
      const fakeGameId = '000000000000000000000000'
      const response = await app.request(`/api/game/${fakeGameId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: [2, 1],
          to: [3, 2],
          captures: [],
          promotion: false
        })
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Game not found')
    })

    test('should return 400 for game that is already over', async () => {
      // Create a game
      const createResponse = await app.request('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleset: { preset: 'english' },
          mode: 'pvp'
        })
      })

      const createData = await createResponse.json()
      const gameId = createData.gameId

      // Manually update game to be over
      await Game.findByIdAndUpdate(gameId, { status: 'red_wins' })

      // Try to make a move
      const response = await app.request(`/api/game/${gameId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: [2, 1],
          to: [3, 2],
          captures: [],
          promotion: false
        })
      })

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.error).toBe('Game is already over')
    })

    test('should return 400 for invalid move format', async () => {
      // Create a game
      const createResponse = await app.request('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleset: { preset: 'english' },
          mode: 'pvp'
        })
      })

      const createData = await createResponse.json()
      const gameId = createData.gameId

      // Try to make an invalid move
      const response = await app.request(`/api/game/${gameId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: [2, 1],
          to: [3, 2]
          // Missing captures and promotion fields
        })
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid move format')
    })

    test('should return 400 for wrong player turn', async () => {
      // Create a game
      const createResponse = await app.request('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleset: { preset: 'english' },
          mode: 'pvp'
        })
      })

      const createData = await createResponse.json()
      const gameId = createData.gameId

      // Try to move a black piece when it's red's turn
      const response = await app.request(`/api/game/${gameId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: [5, 0], // Black piece position
          to: [4, 1],
          captures: [],
          promotion: false
        })
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('It is not your turn to move this piece')
    })

    test('should return 400 for illegal move', async () => {
      // Create a game
      const createResponse = await app.request('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleset: { preset: 'english' },
          mode: 'pvp'
        })
      })

      const createData = await createResponse.json()
      const gameId = createData.gameId

      // Try to make an illegal move (moving diagonally forward 2 spaces)
      const response = await app.request(`/api/game/${gameId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: [2, 1],
          to: [4, 3],
          captures: [],
          promotion: false
        })
      })

      expect(response.status).toBe(422)
      const data = await response.json()
      expect(data.error).toBe('Illegal move')
    })
  })

  describe('POST /api/game/:gameId/resign', () => {
    test('should allow player to resign and end game', async () => {
      // Create a game
      const createResponse = await app.request('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleset: { preset: 'english' },
          mode: 'pvp'
        })
      })

      const createData = await createResponse.json()
      const gameId = createData.gameId

      // Red player resigns
      const response = await app.request(`/api/game/${gameId}/resign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: 'red' })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.state).toBeDefined()
      expect(data.state.status).toBe('black_wins')
    })

    test('should return 404 for non-existent game', async () => {
      const fakeGameId = '000000000000000000000000'
      const response = await app.request(`/api/game/${fakeGameId}/resign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: 'red' })
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Game not found')
    })

    test('should return 400 for game that is already over', async () => {
      // Create a game
      const createResponse = await app.request('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleset: { preset: 'english' },
          mode: 'pvp'
        })
      })

      const createData = await createResponse.json()
      const gameId = createData.gameId

      // Manually update game to be over
      await Game.findByIdAndUpdate(gameId, { status: 'red_wins' })

      // Try to resign
      const response = await app.request(`/api/game/${gameId}/resign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: 'black' })
      })

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.error).toBe('Game is already over')
    })

    test('should return 400 for invalid team', async () => {
      // Create a game
      const createResponse = await app.request('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleset: { preset: 'english' },
          mode: 'pvp'
        })
      })

      const createData = await createResponse.json()
      const gameId = createData.gameId

      // Try to resign with invalid player
      const response = await app.request(`/api/game/${gameId}/resign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: 'invalid' })
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid team')
    })
  })
})
