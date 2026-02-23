/**
 *
 *
 *
 * `void-js` reactivity API names of types and functions.
 *
 *
 * @example
 *
 *
 * ```typescript
 * REACTIVITY_API_NAMES.signalType === 'Signal';
 * REACTIVITY_API_NAMES.getValue === 'getValue';
 * ```
 *
 * That is because:
 *
 * ```typescript
 * import { getValue, type Signal } from 'void';
 * ```
 */

export const REACTIVITY_API_NAMES = {
    signalType: 'Signal',

    getValue: 'getValue',

    setValue: 'setValue',

    postSetValue: 'postSetValue',

    createEffect: 'createEffect',
    createComputation: 'createComputation',

    compute: 'compute',
} as const;
