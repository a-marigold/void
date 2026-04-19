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
    readonly fn: () => Subscriber['cleanup'] | void;

    /**
     *
     * Cleanup of effect. Executed before {@link Subscriber.fn} and when component unmounts.
     */
    cleanup: (() => void) | void | undefined;

    /**
     * `false` - Subscriber is already scheduled.
     *
     * `true` - Subscriber is not scheduled.
     */

    isIdle: boolean;
};

/**
 *
 *
 * Object with the current state of reactive logic.
 *
 * Used to connect state with effects.
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
     * `false` - `flush` is already scheduled.
     *
     * `true` - `flush` is not scheduled.
     */
    isIdle: boolean;

    /**
     *
     * Array with subscribers from `effect` or `memo` that will be run in `flush` function.
     *
     */
    readonly scheduledSubscribers: Subscriber[];

    /**
     *
     *
     *  `Set` with `subscribers` of `signal` or `memo` which are already added to {@link Context.scheduledSubscribers}.
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
    readonly scheduledDependencies: Set<Set<Subscriber>>;
};
export type Signal<T = unknown> = {
    /**
     * `Set` with subscribers, fns and cleanups of which are called when signal is updated.
     */

    readonly subscribers: Set<Subscriber>;

    /**
     *
     *
     * The current value of signal.
     */
    value: T;
};

/**
 *
 * Function that returns the `value` of a `signal`.
 *
 *
 */

export type GetValue = <T>(signal: Signal<T>) => T;

/**
 *
 *
 *
 *
 *
 * `setValue` or `postSetValue`.
 */

export type SetValue = <T>(signal: Signal<T>, value: T) => T;

/**
 *
 * {@link Memo.fn}.
 *
 *
 *
 */

export type MemoFn<out R> = () => R;

export type Memo<out T> = {
    /**
     * `Set` with subscribers, callback and cleanups of which are called when memo is updated.
     */

    readonly subscribers: Set<Subscriber>;

    /**
     * Called when memo is read.
     */

    readonly fn: MemoFn<T>;

    /**
     * Flag, used in `computeMemo`, indicating is memo needs to be recomputed or just {@link Memo.prevValue} should be returned.
     */

    isDirty: boolean;

    /**
     *
     *
     *
     *
     * Previous result of {@link Memo.fn}, which is returned by `computeMemo` until {@link Memo.isDirty} is `false`.
     *
     *
     *
     *
     */

    prevValue: T;
};
