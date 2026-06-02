export interface GameStyleConfig {
  pieceStyleId: string;
  boardStyleId: string;
}

export const DEFAULT_STYLE_CONFIG: GameStyleConfig = {
  pieceStyleId: 'classic',
  boardStyleId: 'classic',
};
