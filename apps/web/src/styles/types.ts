import type React from 'react';

export interface PieceStyle {
  id: string;
  name: string;
  description: string;
  Normal: React.FC<{ team: 'red' | 'black'; size: number }>;
  Crowned: React.FC<{ team: 'red' | 'black'; size: number }>;
}
