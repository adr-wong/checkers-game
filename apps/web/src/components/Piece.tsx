type PieceColor = 'red' | 'black'
type PieceType = 'normal' | 'king'

interface PieceProps {
  color: PieceColor
  type: PieceType
  size?: number
}

interface VariantProps {
  size?: number
}

function Crown({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <polygon
        points="-7,-3 -4,3 0,-1 4,3 7,-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </g>
  )
}

export function Piece({ color, type, size = 40 }: PieceProps) {
  const r = size / 2 - 2
  const cx = size / 2
  const cy = size / 2
  const fill = color === 'red' ? '#e53935' : '#212121'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke="#000" strokeWidth={2} />
      {type === 'king' && <Crown cx={cx} cy={cy - 1} />}
    </svg>
  )
}

export function RedPiece({ size }: VariantProps) {
  return <Piece color="red" type="normal" size={size} />
}

export function BlackPiece({ size }: VariantProps) {
  return <Piece color="black" type="normal" size={size} />
}

export function RedKing({ size }: VariantProps) {
  return <Piece color="red" type="king" size={size} />
}

export function BlackKing({ size }: VariantProps) {
  return <Piece color="black" type="king" size={size} />
}
