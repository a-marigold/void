/**
 *
 * Callback and cleanup of effect.
 */

export type Subscriber = {
    /**
     * The main callback of effect.
     *
     * @returns Cleanup function or nothing.
     */
    fn: () => Subscriber['cleanup'] | void;

    /**
     *
     * Cleanup of effect. Executed before {@link Subscriber.fn} and when component unmounts.
     */
    cleanup: (() => void) | void | undefined;
};

/**
 *
 * Object that contains the current state of reactive logic.
 *
 *
 * Used to connect signals with effects.
 *
 *
 *
 */

export type Context = {
    /**
     *
     * The current running {@link Subscriber.fn}.
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
     *
     * `Set` with functions (subscribers from `effect` or `computation`) that will be run in `batch` function.
     *
     */
    readonly scheduledSubscribers: Set<Subscriber>;

    /**
     *
     * `Set` with `subscribers` of `signal` which are already added to {@link Context.scheduledSubscribers}.
     *
     * Used to identify is there a need to add `subscribers` of `signal` to {@link Context.scheduledSubscribers}.
     *
     *  @example
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
    readonly scheduledDependencies: Set<Signal['subscribers']>;
};
// TODO: remove
/**
 * Function that has logic of scheduling `signal.subscirbers` or `computation.subscirbers` to `context.scheduledSubscribers`
 */
export type ScheduleSubscribers = (
    subscribers: Context['scheduledSubscribers'],
    scheduledSubscribers: Context['scheduledSubscribers'],
    scheduledDependencies: Context['scheduledDependencies'],
) => void;

// signals

export type Signal<T = unknown> = {
    /**
     * `Set` with subscribers, callback and cleanups of which should be called when `Signal.value` changes.
     */
    subscribers: Set<Subscriber>;

    /**
     * The current value of signal.
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
 *
 * Function that sets new value to `signal.value` and runs all `signal.subscribers` (can do it later)
 */
export type SetValue = <T>(signal: Signal<T>, value: T) => T;
