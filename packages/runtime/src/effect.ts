import { context } from './context';
import type { Effect } from './types';

/**
 * #### Sets `context.currentEffect` to {@link Effect} with `fn` argument.
 * #### Calls `fn` argument.
 * #### Sets `context.currentEffect` to `null`.
 *
 * @param fn Function that should be called and subscribed to signals which are used when it is called.
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
