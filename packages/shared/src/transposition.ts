import type { Cell, Move, Team } from './types';

const MAX_SIZE = 10;
const ZOBRIST_PIECES = MAX_SIZE * MAX_SIZE * 2 * 2;
const SIDE_INDEX = ZOBRIST_PIECES; // index for side-to-move hash

let ZOBRIST_TABLE: Uint32Array | null = null;

function initZobrist(): Uint32Array {
  const table = new Uint32Array(SIDE_INDEX + 1);
  for (let i = 0; i <= SIDE_INDEX; i++) {
    table[i] = Math.floor(Math.random() * 0xFFFFFFFF);
  }
  return table;
}

export function hashBoard(board: Cell[][], team: Team): number {
  if (!ZOBRIST_TABLE) ZOBRIST_TABLE = initZobrist();

  let hash = 0;
  const size = board.length;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const piece = board[row][col]?.piece;
      if (piece) {
        const teamIdx = piece.team === 'red' ? 0 : 1;
        const typeIdx = piece.type === 'normal' ? 0 : 1;
        hash ^= ZOBRIST_TABLE[(row * MAX_SIZE + col) * 4 + teamIdx * 2 + typeIdx]!;
      }
    }
  }
  if (team === 'red') hash ^= ZOBRIST_TABLE[SIDE_INDEX]!;

  return hash >>> 0;
}

export interface TTEntry {
  hash: number;
  score: number;
  depth: number;          // Always positive (search depth when stored)
  bound: 0 | 1 | 2;      // 0=exact, 1=lower, 2=upper
  bestMove?: Move;
}

class TranspositionTable {
  private table = new Map<number, TTEntry>();
  private maxSize = 50000;

  get size(): number { return this.table.size; }

  get(hash: number, depth: number): TTEntry | undefined {
    const entry = this.table.get(hash);
    if (!entry || entry.depth < depth) return undefined;
    return entry;
  }

  set(entry: TTEntry): void {
    if (this.table.size >= this.maxSize) {
      const entries = Array.from(this.table.keys());
      const toDelete = Math.floor(this.maxSize * 0.1);
      for (let i = 0; i < toDelete; i++) this.table.delete(entries[i]!);
    }
    this.table.set(entry.hash, entry);
  }

  clear(): void { this.table.clear(); }
  setMaxSize(size: number): void { this.maxSize = size; }
}

export const tt = new TranspositionTable();
export function clearTT(): void { tt.clear(); }
