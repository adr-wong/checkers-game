import type { PieceStyle } from '../types';

function HeraldicNormal({ team, size }: { team: 'red' | 'black'; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const shieldColor = team === 'red' ? '#8b0000' : '#2c2c2c';
  const borderColor = '#d4af37';
  const innerColor = team === 'red' ? '#dc143c' : '#404040';
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Shield shape */}
      <path
        d={`M ${cx} ${cy - r} 
           Q ${cx - r} ${cy - r * 0.3}, ${cx - r * 0.8} ${cy + r * 0.6}
           Q ${cx - r * 0.6} ${cy + r}, ${cx} ${cy + r}
           Q ${cx + r * 0.6} ${cy + r}, ${cx + r * 0.8} ${cy + r * 0.6}
           Q ${cx + r} ${cy - r * 0.3}, ${cx} ${cy - r} Z`}
        fill={shieldColor}
        stroke={borderColor}
        strokeWidth={2}
      />
      
      {/* Inner shield detail */}
      <path
        d={`M ${cx} ${cy - r * 0.7} 
           Q ${cx - r * 0.7} ${cy - r * 0.2}, ${cx - r * 0.6} ${cy + r * 0.4}
           Q ${cx - r * 0.4} ${cy + r * 0.7}, ${cx} ${cy + r * 0.7}
           Q ${cx + r * 0.4} ${cy + r * 0.7}, ${cx + r * 0.6} ${cy + r * 0.4}
           Q ${cx + r * 0.7} ${cy - r * 0.2}, ${cx} ${cy - r * 0.7} Z`}
        fill={innerColor}
        stroke={borderColor}
        strokeWidth={1}
        opacity={0.8}
      />
      
      {/* Decorative corner elements */}
      <circle cx={cx - r * 0.6} cy={cy - r * 0.6} r={2} fill={borderColor} />
      <circle cx={cx + r * 0.6} cy={cy - r * 0.6} r={2} fill={borderColor} />
      <circle cx={cx - r * 0.6} cy={cy + r * 0.6} r={2} fill={borderColor} />
      <circle cx={cx + r * 0.6} cy={cy + r * 0.6} r={2} fill={borderColor} />
    </svg>
  );
}

function HeraldicCrowned({ team, size }: { team: 'red' | 'black'; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const shieldColor = team === 'red' ? '#8b0000' : '#2c2c2c';
  const borderColor = '#d4af37';
  const innerColor = team === 'red' ? '#dc143c' : '#404040';
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Shield shape */}
      <path
        d={`M ${cx} ${cy - r} 
           Q ${cx - r} ${cy - r * 0.3}, ${cx - r * 0.8} ${cy + r * 0.6}
           Q ${cx - r * 0.6} ${cy + r}, ${cx} ${cy + r}
           Q ${cx + r * 0.6} ${cy + r}, ${cx + r * 0.8} ${cy + r * 0.6}
           Q ${cx + r} ${cy - r * 0.3}, ${cx} ${cy - r} Z`}
        fill={shieldColor}
        stroke={borderColor}
        strokeWidth={2}
      />
      
      {/* Inner shield detail */}
      <path
        d={`M ${cx} ${cy - r * 0.7} 
           Q ${cx - r * 0.7} ${cy - r * 0.2}, ${cx - r * 0.6} ${cy + r * 0.4}
           Q ${cx - r * 0.4} ${cy + r * 0.7}, ${cx} ${cy + r * 0.7}
           Q ${cx + r * 0.4} ${cy + r * 0.7}, ${cx + r * 0.6} ${cy + r * 0.4}
           Q ${cx + r * 0.7} ${cy - r * 0.2}, ${cx} ${cy - r * 0.7} Z`}
        fill={innerColor}
        stroke={borderColor}
        strokeWidth={1}
        opacity={0.8}
      />
      
      {/* Decorative corner elements */}
      <circle cx={cx - r * 0.6} cy={cy - r * 0.6} r={2} fill={borderColor} />
      <circle cx={cx + r * 0.6} cy={cy - r * 0.6} r={2} fill={borderColor} />
      <circle cx={cx - r * 0.6} cy={cy + r * 0.6} r={2} fill={borderColor} />
      <circle cx={cx + r * 0.6} cy={cy + r * 0.6} r={2} fill={borderColor} />
      
      {/* Royal crown */}
      <g transform={`translate(${cx}, ${cy - r * 0.8})`}>
        <path
          d={`M -8,-2 L -6,-6 L -4,-2 L -2,-5 L 0,-2 L 2,-5 L 4,-2 L 6,-6 L 8,-2
             L 6,0 L -6,0 Z`}
          fill="#ffd700"
          stroke={borderColor}
          strokeWidth={1}
        />
        <circle cx={-4} cy={-6} r={1.5} fill="#fff" stroke={borderColor} strokeWidth={0.5} />
        <circle cx={0} cy={-6} r={1.5} fill="#fff" stroke={borderColor} strokeWidth={0.5} />
        <circle cx={4} cy={-6} r={1.5} fill="#fff" stroke={borderColor} strokeWidth={0.5} />
        <rect x={-2} y={0} width={4} height={2} fill={borderColor} />
      </g>
    </svg>
  );
}

export const heraldic: PieceStyle = {
  id: 'heraldic',
  name: 'Heraldic Shields',
  description: 'Medieval shield-shaped pieces with ornate gold detailing',
  Normal: HeraldicNormal,
  Crowned: HeraldicCrowned,
};