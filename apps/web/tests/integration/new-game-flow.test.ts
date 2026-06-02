import { test, expect, describe, beforeAll, afterAll, beforeEach } from "bun:test"
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import app from '../../src/server/app'
import { Game } from '../../src/models/game.model'

let mongoServer: MongoMemoryServer
let mongoUri: string

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  mongoUri = mongoServer.getUri()
  await mongoose.connect(mongoUri)
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

beforeEach(async () => {
  await Game.deleteMany({})
})

describe('New Game Flow', () => {
  test('creates 8x8 PvP game and returns playable state', async () => {
    const postResponse = await app.request('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ruleset: { preset: 'english' },
        mode: 'pvp'
      })
    })

    expect(postResponse.status).toBe(201)
    const postData = await postResponse.json()
    expect(postData).toHaveProperty('gameId')
    expect(postData.state.ruleset.boardSize).toBe(8)
    expect(postData.state.mode).toBe('pvp')

    const gameId = postData.gameId

    const stateResponse = await app.request(`/api/game/${gameId}/state`)
    expect(stateResponse.status).toBe(200)
    const stateData = await stateResponse.json()
    expect(stateData.board.length).toBe(64)
    expect(stateData.status).toBe('active')
    expect(stateData.turn).toBe('red')

    const legalResponse = await app.request(`/api/game/${gameId}/legal?row=2&col=1`)
    expect(legalResponse.status).toBe(200)
    const legalData = await legalResponse.json()
    expect(legalData.legal_moves.length).toBeGreaterThan(0)
  })

  test('creates 10x10 PvA game with AI settings', async () => {
    const response = await app.request('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ruleset: { preset: 'international' },
        mode: 'pva',
        difficulty: 'hard',
        algorithm: 'astar',
        ai_team: 'black'
      })
    })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.state.ruleset.boardSize).toBe(10)
    expect(data.state.difficulty).toBe('hard')
    expect(data.state.algorithm).toBe('astar')
    expect(data.state.ai_team).toBe('black')
  })
})
