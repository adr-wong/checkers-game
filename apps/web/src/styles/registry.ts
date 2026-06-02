import type { PieceStyle } from './types';

const DEFAULT_STYLE_ID = 'classic';

class StyleRegistry {
  private styles: Map<string, PieceStyle> = new Map();

  register(style: PieceStyle): void {
    this.styles.set(style.id, style);
  }

  get(id: string): PieceStyle {
    const style = this.styles.get(id);
    if (!style) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Piece style "${id}" not found, falling back to "${DEFAULT_STYLE_ID}"`);
      }
      return this.styles.get(DEFAULT_STYLE_ID)!;
    }
    return style;
  }

  list(): PieceStyle[] {
    return Array.from(this.styles.values());
  }
}

export const registry = new StyleRegistry();
