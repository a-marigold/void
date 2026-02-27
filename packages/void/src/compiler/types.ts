/**
 *
 * All the new keywords that `void-js` provides.
 *
 */
export type VoidKeyword = 'signal' | 'effect' | 'computation';

/**
 *
 * Variety of `void-js` keywords that are used with variable declaration (`signal`, `computation`).
 *
 * @example
 *
 * ```typescript
 * signal a = 16; // assignable
 * computation b = () => undefined; // assignable
 * effect () => { console.log(a); }; // NOT assignable.
 * ```
 *
 */

export type AssignableVoidKeyword = Extract<
    VoidKeyword,
    'signal' | 'computation'
>;

/**
 *
 * Names of `void-js` reactivity API exports to be imported in compiled file.
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
