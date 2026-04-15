import { context } from './context';
import type { Subscriber } from './types';

/**
 * #### Sets `context.currentSubscriber` to `subscriber` argument.
 * #### Calls `subscriber` argument.
 * #### Sets `context.currentSubscriber` to `null`.
 *
 * @param fn Function that should be called and subscribed to signals which are used when it is called.
 *
 * @example
 *
 * ```typescript
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
 */
export const createEffect = (fn: Subscriber['fn']): void => {
    const subscriber: Subscriber = { fn, cleanup: undefined };
    context.currentSubscriber = subscriber;

    try {
        subscriber.cleanup = fn();
    } finally {
        context.currentSubscriber = null;
    }
};
