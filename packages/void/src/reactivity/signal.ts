import type { GetValue, SetValue } from './types';

import { context, batch } from './context';

/**
 * #### Returns the `value` of provided `signal`.
 *
 *
 * @param signal `Signal` object to be read.
 *
 * @returns The `signal.value`.
 *
 *
 *
 *
 * @example
 * ```typescript
 * const count: Signal<number> = {
 *   subscribers: new Set(),
 *   value: 0,
 * };
 *
 * get(count); // This returns 0
 *
 *
 * ```
 */
export const get: GetValue = (signal) => {
    const currentSubscriber = context.currentSubscriber;

    if (currentSubscriber) {
        signal.subscribers.add(currentSubscriber);
    }

    return signal.value;
};

/**
 *
 * #### Assigns `value` argument to `signal.value`.
 * #### Runs all subscribers (can do it later).
 *
 * @param signal `Signal`, `value` property of which will be changed.
 * @param value New value to assign to `signal.value`.
 *
 * @returns Assigned value to `signal`.
 *
 * @example
 *
 *
 *
 * ```typescript
 * const count: Signal<number> = {
 *   subscribers: new Set(),
 *
 *   value: 0,
 * }
 *
 * set(count, 1); // Returns 1
 * ```
 *
 * @example
 *
 * ```typescript
 * const name: Signal<string> = {
 *   subscribers: new Set(),
 *   value: 'a',
 * };
 * const subscriber = () => {
 *   console.log(name.value);
 * };
 *
 * name.subscribers.add(subscriber);
 *
 * set(name, 'b'); // Returns 'b' and runs all the `name.subscribers`, so there will be 'b' in the console
 * ```
 *
 */
export const set: SetValue = (signal, value) => {
    signal.value = value;

    if (!context.isScheduled) {
        queueMicrotask(batch);
        context.isScheduled = true;
    }

    const scheduledSubscribers = context.scheduledSubscribers;

    const subscribers = signal.subscribers;

    for (const subscriber of subscribers) {
        scheduledSubscribers.add(subscriber);
    }

    return value;
};

/**
 *
 * #### Saves the current `signal.value` to `temp`.
 * #### Assigns `value` argument to `signal.value`.
 * #### Runs all `signal.subscribers` (can do it later).
 * #### Returns `temp` from step 1.
 *
 * @param signal `Signal`, `value` property of which will be updated.
 * @param value New value to be assigned to `signal`.
 *
 * @returns The previous `value` of `signal`.
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
 * postSet(count, 1); // Returns 0 and sets 1 to `count.value`.
 * ```
 */
export const postSet: SetValue = (signal, value) => {
    const prevValue = signal.value;

    signal.value = value;

    if (!context.isScheduled) {
        queueMicrotask(batch);
        context.isScheduled = true;
    }

    const scheduledSubscribers = context.scheduledSubscribers;

    const subscribers = signal.subscribers;

    for (const subscriber of subscribers) {
        scheduledSubscribers.add(subscriber);
    }

    return prevValue;
};
