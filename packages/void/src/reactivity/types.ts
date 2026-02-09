/**
 *
 * Callback parameter in computations and effects.
 */

export type Subscriber = () => void;

/**
 *
 * Object that contains the current state of reactive logic.
 *
 *
 *
 *
 *
 * Used to connect signals with computations.
 */

export type Context = {
    currentSubscriber: Subscriber | null;

    scheduled: boolean;
};

/**
 *
 * Object with `subscribers` and `value`.
 */
export type Signal<T = unknown> = { subscribers: Set<Subscriber>; value: T };

/**
 *
 * Function that returns the `value` of a `signal`.
 */

export type GetValue = <T>(signal: Signal<T>) => T;

/**
 *
 * Function that sets new value to `signal.value` and runs all `signal.subscribers` (can do it later).
 */

export type SetValue = <T>(signal: Signal<T>, value: T) => T;

export type CreateEffect = (subscriber: Subscriber) => void;
