import { registry } from './registry';
import { classic } from './presets/classic';
import { bottlecaps } from './presets/bottlecaps';

registry.register(classic);
registry.register(bottlecaps);

export { registry } from './registry';
export type { PieceStyle } from './types';
