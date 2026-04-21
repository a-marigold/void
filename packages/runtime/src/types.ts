/**
 * `memo` or `effect`.
 */
export type Subscriber = {
    /**
     * The main callback.
     *
     * @returns Cleanup function or nothing.
     */
    readonly fn: () => Subscriber['cleanup'] | undefined;

    /**
     *
     * Cleanup of effect. Executed before {@link Subscriber.fn} and when component unmounts.
     */
    readonly cleanup: (() => void) | void;

    /**
     * `false` - Subscriber is already scheduled or processed.
     * `true` - Subscriber is not scheduled or processed.
     */

    isIdle: boolean;
};

/**
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
     *
     *
     *
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
     * `Set` with {@link Memo} that are subscribed on the signal.
     */
    readonly memos: Set<Memo<unknown>>;

    /**
     *The current value of signal.
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
 *
 *
 *
 */
export type SetValue = <T>(signal: Signal<T>, value: T) => T;

/**
 * {@link Memo.fn}.
 */
export type MemoFn<out R> = () => R;

export type Memo<out T> = {
    /**
     * `Set` with subscribers, callback and cleanups of which are called when memo is updated.
     */
    readonly subscribers: Set<Subscriber>;

    /**
     * `Set` with {@link Memo} that are subscribed on the memo.
     */
    readonly memos: Set<Memo<unknown>>;

    /**
     * Called when memo is read.
     *
     */
    readonly fn: MemoFn<T>;

    /**
     * Indicates is memo needs to be recomputed or just {@link Memo.prevValue} should be returned.
     */
    isDirty: boolean;

    /**
     * Previous result of {@link Memo.fn}, which is returned by `computeMemo` until {@link Memo.isDirty} is `false`.
     */
    prevValue: T;

    /**
     *
     * Indicates are {@link Memo.subscribers} need to be scheduled.
     *
     * It is `true` when the last value returned by {@link Memo.fn} is different from {@link Memo.prevValue}.
     */
    isChanged: boolean;
};
