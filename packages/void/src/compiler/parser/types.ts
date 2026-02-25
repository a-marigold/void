import type { VoidKeyword } from '../types';

/**
 *
 * Variety of `void-js` keywords that mean variable declaration (`signal`, `computation`).
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
