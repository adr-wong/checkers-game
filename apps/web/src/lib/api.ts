import { type RuleSet, type GameStatus, type Team } from '@checkers/shared'

const API_BASE = '/api'

// --- Types ---

export interface CreateGameRequest {
  ruleset: { preset: string } | RuleSet
  mode: 'pvp' | 'pva' | 'ava'
  difficulty?: 'easy' | 'medium' | 'hard'
  ai_team?: Team
  algorithm?: 'minimax' | 'astar'
}

export interface GameState {
  gameId: string
  board: string
  ruleset: RuleSet
  turn: Team
  status: GameStatus
  mode: 'pvp' | 'pva' | 'ava'
  difficulty?: 'easy' | 'medium' | 'hard'
  ai_team?: Team
  algorithm?: 'minimax' | 'astar'
  move_count: number
}

export interface MoveResponse {
  from: [number, number]
  to: [number, number]
  captures: [number, number][]
  promotion: boolean
}

export interface LegalMovesResponse {
  turn: Team
  legal_moves: MoveResponse[]
}

// --- Error handling ---

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// --- Internal helpers ---

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  const body = await res.json()

  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? 'Unknown error', body.details)
  }

  return body as T
}

// --- API functions ---

export async function createGame(req: CreateGameRequest): Promise<{ gameId: string; state: GameState }> {
  return request('/game', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function getGameState(gameId: string): Promise<GameState> {
  return request(`/game/${gameId}/state`)
}

export async function getLegalMoves(gameId: string, row: number, col: number): Promise<LegalMovesResponse> {
  return request(`/game/${gameId}/legal?row=${row}&col=${col}`)
}

export async function makeMove(
  gameId: string,
  move: Omit<MoveResponse, 'ruleset'>,
): Promise<{ move: MoveResponse; state: GameState }> {
  return request(`/game/${gameId}/move`, {
    method: 'POST',
    body: JSON.stringify(move),
  })
}

export async function resignGame(gameId: string, team: Team): Promise<{ state: GameState }> {
  return request(`/game/${gameId}/resign`, {
    method: 'POST',
    body: JSON.stringify({ team }),
  })
}
