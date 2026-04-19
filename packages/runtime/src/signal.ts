import { context, flush, scheduleSubscribers } from './context';

import type { GetValue, SetValue } from './types';

/**
 * #### Returns the `value` of provided `signal`.
 *
 * @param signal `Signal` object to be read.
 *
 * @returns The `signal.value`.
 *
 * @example
 * ```typescript
 * const count: Signal<number> = {
 *   subscribers: new Set(),
 *   value: 1616 ,
 * };
 *
 * getValue(count); // This returns 1616
 * ```
 */

export const getValue: GetValue = (signal) => {
    const currentSubscriber = context.currentSubscriber;

    if (currentSubscriber) {
        signal.subscribers.add(currentSubscriber);
    }

    return signal.value;
};
/**
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
 * ```typescript
 * const count: Signal<number> = {
 *   subscribers: new Set(),
 *
 *   value: 0,
 * }
 *
 * setValue(count, 1); // Returns 1
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
 * setValue(name, 'b'); // Returns 'b' and runs all the `name.subscribers`, so there will be 'b' in the console
 * ```
 *
 */
export const setValue: SetValue = (signal, value) => {
    if (signal.value !== value) {
        signal.value = value;

        if (context.isIdle) {
            queueMicrotask(flush);
            context.isIdle = true;
        }

        scheduleSubscribers(signal.subscribers);
    }

    return value;
};

/**
 *
 *
 * #### Saves the current `signal.value` to `temp`.
 * #### Assigns `value` argument to `signal.value`.
 * #### Runs all `signal.subscribers` (can do it later).
 * #### Returns `temp` from step 1.
 *
 * @param signal `Signal`, `value` property of which will be updated.
 *
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
 * postSetValue(count, 1); // Returns 0 and sets 1 to `count.value`.
 * ```
 *
 *
 *
 */

export const postSetValue: SetValue = (signal, value) => {
    const prevValue = signal.value;

    if (prevValue !== value) {
        signal.value = value;

        if (context.isIdle) {
            queueMicrotask(flush);

            context.isIdle = true;
        }

        scheduleSubscribers(signal.subscribers);
    }

    return prevValue;
};
