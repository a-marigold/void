/**
 *
 * All the new keywords that `void-js` provides.
 *
 */
export type VoidKeyword = 'signal' | 'effect' | 'computation';

/**
 *
 * Names of `void-js` reactivity API exports to be imported in compiled file.
 */
export type ReactivityApiName =
    | 'Signal'
    | 'getValue'
    | 'setValue'
    | 'postSetValue'
    | 'createEffect'
    | 'createComputation'
    | 'compute';
