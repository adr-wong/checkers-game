import '~/styles/index'
import { registry } from '~/styles/index'

type PieceColor = 'red' | 'black'
type PieceType = 'normal' | 'king'

interface PieceProps {
  color: PieceColor
  type: PieceType
  size?: number
  styleId?: string
}

interface VariantProps {
  size?: number
  styleId?: string
}

export function Piece({ color, type, size = 40, styleId = 'classic' }: PieceProps) {
  const style = registry.get(styleId)
  const Component = type === 'king' ? style.Crowned : style.Normal
  return <Component team={color} size={size} />
}

export function RedPiece({ size, styleId }: VariantProps) {
  return <Piece color="red" type="normal" size={size} styleId={styleId} />
}

export function BlackPiece({ size, styleId }: VariantProps) {
  return <Piece color="black" type="normal" size={size} styleId={styleId} />
}

export function RedKing({ size, styleId }: VariantProps) {
  return <Piece color="red" type="king" size={size} styleId={styleId} />
}

export function BlackKing({ size, styleId }: VariantProps) {
  return <Piece color="black" type="king" size={size} styleId={styleId} />
}
