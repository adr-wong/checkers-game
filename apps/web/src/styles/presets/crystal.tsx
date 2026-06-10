import type { PieceStyle } from '../types';

function CrystalNormal({ team, size }: { team: 'red' | 'black'; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const baseColor = team === 'red' ? '#e53935' : '#212121';
  const facetColor = team === 'red' ? '#ff6b6b' : '#424242';
  const highlightColor = '#ffffff';
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        {/* Crystal facets */}
        <linearGradient id={`crystal-${team}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={highlightColor} stopOpacity={0.8} />
          <stop offset="30%" stopColor={facetColor} stopOpacity={0.6} />
          <stop offset="60%" stopColor={baseColor} stopOpacity={0.8} />
          <stop offset="100%" stopColor={baseColor} />
        </linearGradient>
        <filter id="crystal-glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Main crystal shape with facets */}
      <g transform={`translate(${cx}, ${cy})`}>
        <polygon
          points={`0,-${r} ${r * 0.866},${r * 0.5} 0,${r * 0.3} -${r * 0.866},${r * 0.5}`}
          fill={`url(#crystal-${team})`}
          stroke="#000"
          strokeWidth={1.5}
          filter="url(#crystal-glow)"
        />
        
        {/* Crystal facets */}
        <line x1="0" y1="-r" x2="0" y2="r * 0.3" stroke={highlightColor} strokeWidth={1} opacity={0.6} />
        <line x1="0" y1="-r" x2="r * 0.866" y2="r * 0.5" stroke={highlightColor} strokeWidth={0.8} opacity={0.4} />
        <line x1="0" y1="-r" x2="-r * 0.866" y2="r * 0.5" stroke={highlightColor} strokeWidth={0.8} opacity={0.4} />
        
        {/* Inner sparkle */}
        <polygon
          points={`0,-${r * 0.6} ${r * 0.3},0 0,${r * 0.2} -${r * 0.3},0`}
          fill={highlightColor}
          opacity={0.7}
        />
      </g>
    </svg>
  );
}

function CrystalCrowned({ team, size }: { team: 'red' | 'black'; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const baseColor = team === 'red' ? '#e53935' : '#212121';
  const facetColor = team === 'red' ? '#ff6b6b' : '#424242';
  const highlightColor = '#ffffff';
  const crownColor = '#ffd700';
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        {/* Crystal facets */}
        <linearGradient id={`crystal-crown-${team}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={highlightColor} stopOpacity={0.8} />
          <stop offset="30%" stopColor={facetColor} stopOpacity={0.6} />
          <stop offset="60%" stopColor={baseColor} stopOpacity={0.8} />
          <stop offset="100%" stopColor={baseColor} />
        </linearGradient>
        <linearGradient id="crown-gem" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={crownColor} />
          <stop offset="50%" stopColor="#ffed4e" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
        <filter id="crystal-glow-crown">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Main crystal shape with facets */}
      <g transform={`translate(${cx}, ${cy})`}>
        <polygon
          points={`0,-${r} ${r * 0.866},${r * 0.5} 0,${r * 0.3} -${r * 0.866},${r * 0.5}`}
          fill={`url(#crystal-crown-${team})`}
          stroke="#000"
          strokeWidth={1.5}
          filter="url(#crystal-glow-crown)"
        />
        
        {/* Crystal facets */}
        <line x1="0" y1="-r" x2="0" y2="r * 0.3" stroke={highlightColor} strokeWidth={1} opacity={0.6} />
        <line x1="0" y1="-r" x2="r * 0.866" y2="r * 0.5" stroke={highlightColor} strokeWidth={0.8} opacity={0.4} />
        <line x1="0" y1="-r" x2="-r * 0.866" y2="r * 0.5" stroke={highlightColor} strokeWidth={0.8} opacity={0.4} />
        
        {/* Inner sparkle */}
        <polygon
          points={`0,-${r * 0.6} ${r * 0.3},0 0,${r * 0.2} -${r * 0.3},0`}
          fill={highlightColor}
          opacity={0.7}
        />
      </g>
      
      {/* Crystal crown */}
      <g transform={`translate(${cx}, ${cy - r * 0.8})`}>
        <polygon
          points={`-8,-4 -6,-2 -4,-4 -2,-2 0,-4 2,-2 4,-4 6,-2 8,-4 6,0 -6,0`}
          fill="url(#crown-gem)"
          stroke="#8b6914"
          strokeWidth={1}
        />
        
        {/* Crown gem facets */}
        <polygon points={`0,-4 2,-2 0,0`} fill={highlightColor} opacity={0.8} />
        <polygon points={`-4,-4 -2,-2 -4,0`} fill={highlightColor} opacity={0.6} />
        <polygon points={`4,-4 2,-2 4,0`} fill={highlightColor} opacity={0.6} />
        
        <circle cx={0} cy={0} r={1} fill={highlightColor} />
      </g>
    </svg>
  );
}

export const crystal: PieceStyle = {
  id: 'crystal',
  name: 'Crystal',
  description: 'Faceted crystal pieces with magical sparkle effects',
  Normal: CrystalNormal,
  Crowned: CrystalCrowned,
};