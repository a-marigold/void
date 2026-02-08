/**
 *
 * Callback parameter in computations and effects.
 */

export type Subscriber = () => void;

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
