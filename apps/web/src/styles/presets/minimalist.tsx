import type { PieceStyle } from '../types';

function MinimalistNormal({ team, size }: { team: 'red' | 'black'; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const fillColor = team === 'red' ? '#e53935' : '#212121';
  const ringColor = team === 'red' ? '#ff5252' : '#424242';
  const borderColor = '#666';
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={r} fill={fillColor} stroke={borderColor} strokeWidth={1} />
      
      {/* Inner ring */}
      <circle cx={cx} cy={cy} r={r * 0.7} fill="none" stroke={ringColor} strokeWidth={1} opacity={0.6} />
      
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={r * 0.1} fill={borderColor} />
    </svg>
  );
}

function MinimalistCrowned({ team, size }: { team: 'red' | 'black'; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const fillColor = team === 'red' ? '#e53935' : '#212121';
  const ringColor = team === 'red' ? '#ff5252' : '#424242';
  const borderColor = '#666';
  const crownColor = '#ffd700';
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={r} fill={fillColor} stroke={borderColor} strokeWidth={1} />
      
      {/* Inner ring */}
      <circle cx={cx} cy={cy} r={r * 0.7} fill="none" stroke={ringColor} strokeWidth={1} opacity={0.6} />
      
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={r * 0.1} fill={borderColor} />
      
      {/* Crown symbol */}
      <g transform={`translate(${cx}, ${cy - r * 0.4})`}>
        {/* Plus sign crown */}
        <g stroke={crownColor} strokeWidth={2} fill="none">
          <line x1={-r * 0.3} y1={0} x2={r * 0.3} y2={0} />
          <line x1={0} y1={-r * 0.3} x2={0} y2={r * 0.3} />
        </g>
        
        {/* Crown border */}
        <rect x={-r * 0.4} y={-r * 0.35} width={r * 0.8} height={r * 0.7} 
              fill="none" stroke={borderColor} strokeWidth={1} rx={2} />
      </g>
    </svg>
  );
}

export const minimalist: PieceStyle = {
  id: 'minimalist',
  name: 'Minimalist',
  description: 'Clean, modern design with subtle geometric details',
  Normal: MinimalistNormal,
  Crowned: MinimalistCrowned,
};