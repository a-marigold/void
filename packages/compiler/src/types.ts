/**
 *
 * All the new keywords that `void-js` provides.
 *
 */
export type VoidKeyword = 'signal' | 'effect' | 'memo';

/**
 * Specific to `void-js` syntax constructions like components.
 */
export type VoidConstruction = 'component';
/**
 *
 *
 *
 * Names of `void-js` runtime API exports to be imported in compiled file.
 */
export type RuntimeApiName =
    | 'getValue'
    | 'setValue'
    | 'postSetValue'
    | 'createEffect'
    | 'createComputation'
    | 'compute'
    | RuntimeTypeName;

/**
 *
 * Names of `void-js` reactivity API that should be imported as types.
 */

export type RuntimeTypeName = 'Signal';
