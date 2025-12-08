import type {
    Signal,
    SignalGetter,
    SignalSetter,
    Subscribers,
} from './types/Signal';

import { currentComputation } from './context';

export type SignalFactory = {
    <T>(value: T): Signal<T>;
    <T>(value?: T): Signal<T | undefined>;
    (): Signal<unknown>;
};

/**
 *
 * @param {any} value
 * @returns Signal object with `get` and `set` properties
 *
 * @example
 * ```typescript
 * const count = signal(0);
 *
 * effect(() => {
 *    console.log(count.get());
 * })
 *
 * document.querySelector('button').addEventListener('click', () => {
 *    count.set(count.get() + 1)
 * })
 * ```
 */
export const signal: SignalFactory = <T>(value?: T): Signal<T | undefined> => {
    const subscribers: Subscribers = new Set();

    const getter: SignalGetter<T | undefined> = () => {
        if (currentComputation) {
            subscribers.add(currentComputation);
        }
        return value;
    };

    const setter: SignalSetter<T | undefined> = (newValue) => {
        value = newValue;
        subscribers.forEach((subscriber) => {
            subscriber.fn();
        });
    };
    return { get: getter, set: setter };
};
