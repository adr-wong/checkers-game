import { Piece } from './Piece'
import './Board.css'

type Team = 'red' | 'black'
type PieceType = 'normal' | 'king'

interface Cell {
  piece: { team: Team; type: PieceType } | null
}

interface BoardProps {
  boardSize: 8 | 10
  cells: Cell[][]
  selectedPosition?: [number, number] | null
  legalMoves?: Array<{ to: [number, number] }>
  lastMove?: { from: [number, number]; to: [number, number] } | null
  onCellClick?: (row: number, col: number) => void
  disabled?: boolean
  boardRef?: React.RefObject<HTMLDivElement | null>
  animatingFrom?: [number, number] | null
  capturedPositions?: Array<[number, number]>
}

export function Board({
  boardSize,
  cells,
  selectedPosition,
  legalMoves,
  lastMove,
  onCellClick,
  disabled,
  boardRef,
  animatingFrom,
  capturedPositions,
}: BoardProps) {
  const isDarkCell = (row: number, col: number) => (row + col) % 2 === 1

  const isSelected = (row: number, col: number) =>
    selectedPosition?.[0] === row && selectedPosition?.[1] === col

  const isLegalMove = (row: number, col: number) =>
    legalMoves?.some((m) => m.to[0] === row && m.to[1] === col) ?? false

  const isLastMoveCell = (row: number, col: number) =>
    lastMove &&
    ((lastMove.from[0] === row && lastMove.from[1] === col) ||
      (lastMove.to[0] === row && lastMove.to[1] === col))

  return (
    <div
      ref={boardRef}
      className="board"
      style={{
        gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
        gridTemplateRows: `repeat(${boardSize}, 1fr)`,
      }}
    >
      {cells.map((row, rowIdx) =>
        row.map((cell, colIdx) => {
          const dark = isDarkCell(rowIdx, colIdx)
          const selected = isSelected(rowIdx, colIdx)
          const legal = isLegalMove(rowIdx, colIdx)
          const last = isLastMoveCell(rowIdx, colIdx)
          const isAnimatingFromCell =
            animatingFrom?.[0] === rowIdx && animatingFrom?.[1] === colIdx
          const isCapturedCell =
            capturedPositions?.some(([r, c]) => r === rowIdx && c === colIdx) ?? false

          return (
            <div
              key={`${rowIdx}-${colIdx}`}
              className={[
                'cell',
                dark ? 'cell--dark' : 'cell--light',
                selected && 'cell--selected',
                legal && 'cell--legal',
                last && 'cell--last',
                disabled && 'cell--disabled',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => !disabled && onCellClick?.(rowIdx, colIdx)}
            >
              {cell.piece && !isAnimatingFromCell && !isCapturedCell && (
                <Piece
                  color={cell.piece.team}
                  type={cell.piece.type}
                />
              )}
              {legal && !cell.piece && <div className="legal-dot" />}
            </div>
          )
        })
      )}
    </div>
  )
}
