import type { PieceStyle } from '../types';

function BottleCapNormal({ team, size }: { team: 'red' | 'black'; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 2;
  const innerR = outerR * 0.75;
  const fill = team === 'red' ? '#e53935' : '#212121';
  const scallops = 12;
  const scallopDepth = outerR * 0.15;

  const pathParts: string[] = [];
  for (let i = 0; i < scallops; i++) {
    const angle1 = (i / scallops) * Math.PI * 2;
    const angle2 = ((i + 0.5) / scallops) * Math.PI * 2;
    const angle3 = ((i + 1) / scallops) * Math.PI * 2;

    const x1 = cx + Math.cos(angle1) * outerR;
    const y1 = cy + Math.sin(angle1) * outerR;
    const xMid = cx + Math.cos(angle2) * (outerR - scallopDepth);
    const yMid = cy + Math.sin(angle2) * (outerR - scallopDepth);
    const x2 = cx + Math.cos(angle3) * outerR;
    const y2 = cy + Math.sin(angle3) * outerR;

    if (i === 0) {
      pathParts.push(`M ${x1} ${y1}`);
    }
    pathParts.push(`Q ${xMid} ${yMid} ${x2} ${y2}`);
  }
  pathParts.push('Z');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={pathParts.join(' ')} fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="#000" strokeWidth={1} opacity={0.3} />
    </svg>
  );
}

function BottleCapCrowned({ team, size }: { team: 'red' | 'black'; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 2;
  const fill = team === 'red' ? '#e53935' : '#212121';
  const scallops = 12;
  const scallopDepth = outerR * 0.15;

  const pathParts: string[] = [];
  for (let i = 0; i < scallops; i++) {
    const angle1 = (i / scallops) * Math.PI * 2;
    const angle2 = ((i + 0.5) / scallops) * Math.PI * 2;
    const angle3 = ((i + 1) / scallops) * Math.PI * 2;

    const x1 = cx + Math.cos(angle1) * outerR;
    const y1 = cy + Math.sin(angle1) * outerR;
    const xMid = cx + Math.cos(angle2) * (outerR - scallopDepth);
    const yMid = cy + Math.sin(angle2) * (outerR - scallopDepth);
    const x2 = cx + Math.cos(angle3) * outerR;
    const y2 = cy + Math.sin(angle3) * outerR;

    if (i === 0) {
      pathParts.push(`M ${x1} ${y1}`);
    }
    pathParts.push(`Q ${xMid} ${yMid} ${x2} ${y2}`);
  }
  pathParts.push('Z');

  const starR = size * 0.15;
  const starPoints: string[] = [];
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const innerAngle = ((i + 0.5) / 5) * Math.PI * 2 - Math.PI / 2;
    const ox = cx + Math.cos(outerAngle) * starR;
    const oy = cy - size * 0.1 + Math.sin(outerAngle) * starR;
    const ix = cx + Math.cos(innerAngle) * (starR * 0.4);
    const iy = cy - size * 0.1 + Math.sin(innerAngle) * (starR * 0.4);
    starPoints.push(`${ox},${oy}`);
    starPoints.push(`${ix},${iy}`);
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={pathParts.join(' ')} fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={outerR * 0.75} fill="none" stroke="#000" strokeWidth={1} opacity={0.3} />
      <polygon points={starPoints.join(' ')} fill="#ffd700" stroke="#000" strokeWidth={0.5} />
    </svg>
  );
}

export const bottlecaps: PieceStyle = {
  id: 'bottlecaps',
  name: 'Bottle Caps',
  description: 'Bottle cap shaped pieces with scalloped edges',
  Normal: BottleCapNormal,
  Crowned: BottleCapCrowned,
};
