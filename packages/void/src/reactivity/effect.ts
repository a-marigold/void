import { context } from './context';

import type { CreateEffect } from './types';

/**
 *
 * #### Sets `context.currentSubscriber` to `subscriber` argument.
 * #### Calls `subscriber` argument.
 * #### Sets `context.currentSubscriber` to `null`.
 *
 * @param subscriber Function that will be called and subscribed to signals which were run while the function was executing.
 *
 *
 *
 *
 * @example
 *
 * ```typescript
 * const count: Signal<number> = {
 *   subscribers: new Set(),
 *   value: 0,
 * };
 *
 * createEffect(() => {
 *   console.log('Count: ' + get(count)); // get function from `signal` module has logic that subscribes current effect
 * });
 *
 * set(count, 1); // There will be 'Count: 1' in console
 * ```
 *
 *
 *
 */
export const createEffect: CreateEffect = (subscriber) => {
    context.currentSubscriber = subscriber;

    try {
        subscriber();
    } finally {
        context.currentSubscriber = null;
    }
};
