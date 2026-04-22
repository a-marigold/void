/**
 * `memo` or `effect`.
 */
export type Subscriber = {
    /**
     * The main callback.
     *
     * @returns Cleanup effect or nothing.
     */
    readonly fn: () => Subscriber['cleanup'] | undefined;

    /**
     *
     * Cleanup of effect. Executed before {@link Subscriber.fn} and when component unmounts.
     */
    readonly cleanup: (() => void) | void;

    /**
     * `true` when subscriber is not scheduled to {@link Context.scheduledSubscribers}.
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
     * The current {@link Subscriber} with running `fn`.
     */

    currentSubscriber: Subscriber | null;

    /**
     * The current {@link Memo} with running `fn`.
     */
    currentMemo: Memo<unknown> | null;

    /**
     *
     *
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

    readonly scheduledDependencies: Set<Subscriber[]>;
};
export type Signal<T = unknown> = {
    /**
     *
     * Subscribers, fns and cleanups of which are called when signal is updated.
     */
    readonly subscribers: Subscriber[];

    /**
     *
     * {@link Memo|Memos} that are subscribed on signal.
     */

    readonly memos: Memo<unknown>[];

    /**
     * The current value of signal.
     */
    value: T;

    /**
     * The last subscriber that is subscribed on signal.
     */

    lastSubscriber: Subscriber | null;

    /**
     * The last memo that is subscribed on signal.
     */
    lastMemo: Memo<unknown> | null;
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
 * `setValue` or `postSetValue`.
 */
export type SetValue = <T>(signal: Signal<T>, value: T) => T;

/**
 * {@link Memo.fn}.
 */
export type MemoFn<out R> = () => R;

export type Memo<out T> = {
    /**
     * Subscribers, callback and cleanups of which are called when memo is updated.
     */

    readonly subscribers: Subscriber[];

    /**
     * {@link Memo|Memos} that are subscribed on the memo.
     */
    readonly memos: Memo<unknown>[];

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
     * The last subscriber subscribed on memo.
     */

    lastSubscriber: Subscriber | null;

    /**
     * The last memo subscirbed on memo.
     */

    lastMemo: Memo<unknown> | null;
};
