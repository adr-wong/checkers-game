import type { PieceStyle } from '../types';

function ClassicNormal({ team, size }: { team: 'red' | 'black'; size: number }) {
  const r = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const fill = team === 'red' ? '#e53935' : '#212121';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke="#000" strokeWidth={2} />
    </svg>
  );
}

function ClassicCrowned({ team, size }: { team: 'red' | 'black'; size: number }) {
  const r = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const fill = team === 'red' ? '#e53935' : '#212121';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke="#000" strokeWidth={2} />
      <g transform={`translate(${cx}, ${cy - 1})`}>
        <polygon
          points="-7,-3 -4,3 0,-1 4,3 7,-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export const classic: PieceStyle = {
  id: 'classic',
  name: 'Classic',
  description: 'Traditional checkers pieces with simple circle design',
  Normal: ClassicNormal,
  Crowned: ClassicCrowned,
};
