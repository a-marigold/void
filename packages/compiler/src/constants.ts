import type { RuntimeTypeName } from './types';

/**
 *
 * `void-js` reactivity API names that should be imported as types.
 */
export const RUNTIME_TYPE_NAMES = { Signal: true } as const satisfies Record<
    RuntimeTypeName,
    true
>;
