import { context } from './context';
import type { Effect } from './types';

/**
 * #### Sets `context.currentEffect` to {@link Effect} with `fn` argument.
 * #### Calls `fn` argument.
 * #### Sets `context.currentEffect` to `null`.
 *
 * @param fn Function that should be called and subscribed to signals which are used when it is called.
 *
 * @example
 *
 * ```typescript
 *
 * const count: Signal<number> = {
 *   subscribers: new Set(),
 *
 *   value: 0,
 * };
 *
 * createEffect(() => {
 *   console.log('Count: ' + get(count)); // get function has logic that subscribes current effect
 * });
 *
 *
 * set(count, 1); // There will be 'Count: 1' in console
 * ```
 *
 */

export const createEffect = (fn: Effect['fn']): void => {
    const effect: Effect = {
        fn,
        cleanup: undefined,
        isIdle: true,
    };

    try {
        context.currentEffect = effect;

        (effect as Record<string, unknown>).cleanup = fn();
    } finally {
        context.currentEffect = null;
    }
};
