import { useEffect, useState } from 'react'
import { Piece } from './Piece'

interface AnimatingPiece {
  pieceColor: 'red' | 'black'
  pieceType: 'normal' | 'king'
  from: [number, number]
  to: [number, number]
}

interface AnimationOverlayProps {
  boardRef: React.RefObject<HTMLDivElement | null>
  boardSize: 8 | 10
  animatingPiece: AnimatingPiece | null
  progress: number
}

function getCellCenter(
  boardRef: React.RefObject<HTMLDivElement | null>,
  row: number,
  col: number,
  boardSize: 8 | 10,
): { x: number; y: number } | null {
  if (!boardRef.current) return null
  const boardRect = boardRef.current.getBoundingClientRect()
  const cells = boardRef.current.querySelectorAll('.cell')
  const cellIndex = row * boardSize + col
  const cell = cells[cellIndex] as HTMLElement | undefined
  if (!cell) return null
  const cellRect = cell.getBoundingClientRect()
  return {
    x: cellRect.left - boardRect.left + cellRect.width / 2,
    y: cellRect.top - boardRect.top + cellRect.height / 2,
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function AnimationOverlay({
  boardRef,
  boardSize,
  animatingPiece,
  progress,
}: AnimationOverlayProps) {
  const [fromPos, setFromPos] = useState<{ x: number; y: number } | null>(null)
  const [toPos, setToPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!animatingPiece) return
    const from = getCellCenter(boardRef, animatingPiece.from[0], animatingPiece.from[1], boardSize)
    const to = getCellCenter(boardRef, animatingPiece.to[0], animatingPiece.to[1], boardSize)
    setFromPos(from)
    setToPos(to)
  }, [animatingPiece, boardRef, boardSize])

  if (!animatingPiece || !fromPos || !toPos) return null

  const easedProgress = easeOutCubic(progress)
  const currentX = fromPos.x + (toPos.x - fromPos.x) * easedProgress
  const currentY = fromPos.y + (toPos.y - fromPos.y) * easedProgress

  return (
    <div className="animation-overlay">
      <div
        className="animating-piece"
        style={{
          transform: `translate(${currentX - 20}px, ${currentY - 20}px)`,
        }}
      >
        <Piece
          color={animatingPiece.pieceColor}
          type={animatingPiece.pieceType}
        />
      </div>
    </div>
  )
}
