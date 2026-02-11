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
     * `Set` with functions (subscribers from `effect` or `computation`)that will be run in `batch` function.
     *
     */
    readonly scheduledSubscribers: Set<Subscriber>;

    /**
     * `Set` with signals, `subscribers` of which are already added to {@link Context.scheduledSubscribers}.
     *
     *
     *
     */

    readonly scheduledSignals: Set<Signal>;

    readonly subscriberStack: Subscriber[];
};

/**
 *
 *
 *
 * Function that runs all the {@link Context.scheduledSubscribers}
 *
 *
 *
 *
 */
export type Batch = () => void;

// signals

/**
 *
 * Object with `subscribers` and `value`.
 */
export type Signal<T = unknown> = { subscribers: Set<Subscriber>; value: T };

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

export type Computer = <R = unknown>() => R;

export type CreateEffect = (subscriber: Subscriber) => void;

export type Computation = {
    subscribers: Set<Subscriber>;

    computer: Subscriber;
};
export type CreateComputation = (computer: Computer) => Computation;
