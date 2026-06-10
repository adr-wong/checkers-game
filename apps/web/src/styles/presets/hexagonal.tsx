import type { PieceStyle } from '../types';

function HexagonalNormal({ team, size }: { team: 'red' | 'black'; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const fill = team === 'red' ? '#e53935' : '#212121';
  
  // Create hexagon path
  const hexPoints = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    hexPoints.push(`${x},${y}`);
  }
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon points={hexPoints.join(' ')} fill={fill} stroke="#000" strokeWidth={2} />
      <polygon points={hexPoints.join(' ')} fill="none" stroke="#fff" strokeWidth={1} opacity={0.3} />
    </svg>
  );
}

function HexagonalCrowned({ team, size }: { team: 'red' | 'black'; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const fill = team === 'red' ? '#e53935' : '#212121';
  
  // Create hexagon path
  const hexPoints = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    hexPoints.push(`${x},${y}`);
  }
  
  // Crown points
  const crownR = size * 0.12;
  const crownY = cy - size * 0.1;
  const crownPoints = [];
  for (let i = 0; i < 5; i++) {
    const x = cx + (i - 2) * crownR * 0.8;
    const y = i % 2 === 0 ? crownY - crownR : crownY;
    crownPoints.push(`${x},${y}`);
  }
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon points={hexPoints.join(' ')} fill={fill} stroke="#000" strokeWidth={2} />
      <polygon points={hexPoints.join(' ')} fill="none" stroke="#fff" strokeWidth={1} opacity={0.3} />
      <polygon points={crownPoints.join(' ')} fill="#ffd700" stroke="#000" strokeWidth={1} />
      <circle cx={cx} cy={crownY} r={crownR * 0.5} fill="#fff" stroke="#000" strokeWidth={0.5} />
    </svg>
  );
}

export const hexagonal: PieceStyle = {
  id: 'hexagonal',
  name: 'Hexagonal',
  description: 'Modern geometric hexagonal pieces with metallic accents',
  Normal: HexagonalNormal,
  Crowned: HexagonalCrowned,
};