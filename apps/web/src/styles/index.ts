import { registry } from './registry';
import { classic } from './presets/classic';
import { bottlecaps } from './presets/bottlecaps';
import { hexagonal } from './presets/hexagonal';
import { marble } from './presets/marble';
import { heraldic } from './presets/heraldic';
import { crystal } from './presets/crystal';
import { minimalist } from './presets/minimalist';

registry.register(classic);
registry.register(bottlecaps);
registry.register(hexagonal);
registry.register(marble);
registry.register(heraldic);
registry.register(crystal);
registry.register(minimalist);

export { registry } from './registry';
export type { PieceStyle } from './types';

export const FREE_STYLE_IDS = new Set(['classic']);

export const PREMIUM_STYLES: Record<string, { name: string; priceUsd: number }> = {
  bottlecaps:  { name: 'Bottle Caps',  priceUsd: 2 },
  crystal:     { name: 'Crystal',      priceUsd: 2 },
  heraldic:    { name: 'Heraldic',     priceUsd: 2 },
  hexagonal:   { name: 'Hexagonal',    priceUsd: 2 },
  marble:      { name: 'Marble',       priceUsd: 2 },
  minimalist:  { name: 'Minimalist',   priceUsd: 2 },
};

export const isStripeEnabled = !!process.env.STRIPE_SECRET_KEY;
