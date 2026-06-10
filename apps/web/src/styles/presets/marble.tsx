import type { PieceStyle } from '../types';

function MarbleNormal({ team, size }: { team: 'red' | 'black'; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const baseColor = team === 'red' ? '#8b0000' : '#1a1a1a';
  const highlightColor = team === 'red' ? '#dc143c' : '#2a2a2a';
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Base circle */}
      <defs>
        <radialGradient id={`marble-${team}`} cx="30%" cy="30%">
          <stop offset="0%" stopColor={highlightColor} stopOpacity={0.8} />
          <stop offset="50%" stopColor={baseColor} stopOpacity={0.9} />
          <stop offset="100%" stopColor={baseColor} />
        </radialGradient>
        <filter id="marble-shadow">
          <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.3" />
        </filter>
      </defs>
      
      <circle cx={cx} cy={cy} r={r} fill={`url(#marble-${team})`} stroke="#000" strokeWidth={2} filter="url(#marble-shadow)" />
      
      {/* Marble veins */}
      <ellipse cx={cx - r * 0.3} cy={cy - r * 0.2} rx={r * 0.4} ry={r * 0.1} fill="#000" opacity={0.1} />
      <ellipse cx={cx + r * 0.2} cy={cy + r * 0.3} rx={r * 0.3} ry={r * 0.08} fill="#000" opacity={0.08} />
      <ellipse cx={cx} cy={cy} rx={r * 0.5} ry={r * 0.2} fill="#000" opacity={0.05} />
    </svg>
  );
}

function MarbleCrowned({ team, size }: { team: 'red' | 'black'; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const baseColor = team === 'red' ? '#8b0000' : '#1a1a1a';
  const highlightColor = team === 'red' ? '#dc143c' : '#2a2a2a';
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Base circle */}
      <defs>
        <radialGradient id={`marble-crown-${team}`} cx="30%" cy="30%">
          <stop offset="0%" stopColor={highlightColor} stopOpacity={0.8} />
          <stop offset="50%" stopColor={baseColor} stopOpacity={0.9} />
          <stop offset="100%" stopColor={baseColor} />
        </radialGradient>
        <filter id="marble-shadow-crown">
          <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity={0.3} />
        </filter>
        <linearGradient id="crown-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="50%" stopColor="#ffed4e" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
      </defs>
      
      <circle cx={cx} cy={cy} r={r} fill={`url(#marble-crown-${team})`} stroke="#000" strokeWidth={2} filter="url(#marble-shadow-crown)" />
      
      {/* Marble veins */}
      <ellipse cx={cx - r * 0.3} cy={cy - r * 0.2} rx={r * 0.4} ry={r * 0.1} fill="#000" opacity={0.1} />
      <ellipse cx={cx + r * 0.2} cy={cy + r * 0.3} rx={r * 0.3} ry={r * 0.08} fill="#000" opacity={0.08} />
      <ellipse cx={cx} cy={cy} rx={r * 0.5} ry={r * 0.2} fill="#000" opacity={0.05} />
      
      {/* Crown */}
      <g transform={`translate(${cx}, ${cy - size * 0.15})`}>
        <polygon
          points="-8,-4 -5,0 -3,-2 0,2 3,-2 5,0 8,-4"
          fill="url(#crown-gradient)"
          stroke="#8b6914"
          strokeWidth={1}
        />
        <circle cx={-8} cy={-4} r={1.5} fill="#fff" stroke="#8b6914" strokeWidth={0.5} />
        <circle cx={0} cy={-4} r={1.5} fill="#fff" stroke="#8b6914" strokeWidth={0.5} />
        <circle cx={8} cy={-4} r={1.5} fill="#fff" stroke="#8b6914" strokeWidth={0.5} />
      </g>
    </svg>
  );
}

export const marble: PieceStyle = {
  id: 'marble',
  name: 'Marble',
  description: 'Luxurious marble-textured pieces with realistic depth and gradients',
  Normal: MarbleNormal,
  Crowned: MarbleCrowned,
};