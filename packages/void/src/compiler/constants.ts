import type { ReactivityApiName } from './types';

/**
 *
 * Object with names of `void-js` reactivity API.
 */
export const REACTIVITY_API_NAMES: {
    [K in ReactivityApiName]: ReactivityApiName;
} = {
    /**
     * Type of identifier that defined via `signal` keyword.
     */
    Signal: 'Signal',

    /**
     * `Signal.value` getter.
     */
    getValue: 'getValue',

    /**
     * `Signal.value` setter.
     */
    setValue: 'setValue',

    /**
     * `Signal.value` setter that returns previous value of a `Signal`.
     */
    postSetValue: 'postSetValue',

    createEffect: 'createEffect',

    createComputation: 'createComputation',

    /**
     * Function that computes a `Computation`.
     */
    compute: 'compute',
};
