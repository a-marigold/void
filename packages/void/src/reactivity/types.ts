/**
 *
 * Callback parameter in computations and effects.
 */

export type Subscriber = () => void;

/**
 *
 *
 * Object that contains the current state of reactive logic.
 *
 *
 *
 *
 * Used to connect signals with computations.
 *
 *
 */

export type Context = {
    /**
     *
     * The current running {@link Subscriber} function.
     *
     * Used to add correct computations and effects to {@link Signal.subscribers}.
     */
    currentSubscriber: Subscriber | null;

    /**
     *
     *
     * Flag that means is there a scheduled `batch` call.
     */
    isScheduled: boolean;

    /**
     * `Set` with functions (subscribers from `effect` or `computation`) that will be run in `batch` function.
     *
     */
    readonly scheduledSubscribers: Set<Subscriber>;

    /**
     * `Set` with `subscribers` of `signal` or `computation` which are already added to {@link Context.scheduledSubscribers}.
     *
     * Used to identify is there a need to add `signal` or `computation` `subscribers` to {@link Context.scheduledSubscribers}.
     *
     * @example
     *
     * ```typescript
     *
     * const count: Signal<number> = {
     *   subscribers: new Set(),
     *   value: 0,
     * };
     *
     * context.scheduledDependencies.add(count.subscribers);
     * ```
     *
     */
    readonly scheduledDependencies: Set<Set<Subscriber>>;
};

/**
 *
 *
 * Function that runs all the {@link Context.scheduledSubscribers}.
 *
 *
 *
 *
 *
 */
export type Flush = () => void;

// signals

export type Signal<T = unknown> = {
    /**
     *
     *
     * `Set` with Functions that should be called when `Signal.value` changes.
     *
     */

    subscribers: Set<Subscriber>;

    /**
     *
     *
     * The current value of signal.
     *
     */

    value: T;
};

/**
 *
 * Function that returns the `value` of a `signal`.
 *
 */

export type GetValue = <T>(signal: Signal<T>) => T;

/**
 *
 *
 *
 * Function that sets new value to `signal.value` and runs all `signal.subscribers` (can do it later)
 */

export type SetValue = <T>(signal: Signal<T>, value: T) => T;

// computations

export type Computer<R> = () => R;

export type CreateEffect = (subscriber: Subscriber) => void;

export type Computation<T> = {
    subscribers: Set<Subscriber>;
    computer: Computer<T>;
};
export type CreateComputation<T = unknown> = (
    computer: Computer<T>,
) => Computation<T>;

export type Compute = <T>(computation: Computation<T>) => T;
