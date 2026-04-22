/**
 *
 * Object with the current state of reactive logic.
 *
 * Used to connect state with effects.
 */

export type Context = {
    /**
     * The current {@link Effect} with running `fn`.
     */

    currentEffect: Effect | null;

    /**
     * The current {@link Memo} with running `fn`.
     */
    currentMemo: Memo<unknown> | null;

    /**
     * `false` - `flush` is already scheduled.
     *
     * `true` - `flush` is not scheduled.
     */

    isIdle: boolean;

    /**
     * Effects that that are run in `flush` function.
     */

    readonly scheduledEffects: Effect[];

    /**
     * `Set` with `subscribers` of `signal` or `memo` which are already added to {@link Context.scheduledEffects}.
     *
     * Used to identify is there a need to add `subscribers` of `signal` to {@link Context.scheduledEffects}.
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

    readonly scheduledDependencies: Set<Effect[]>;
};
export type Signal<T = unknown> = {
    /**
     *
     * Effects subscribed to signal.
     */

    readonly effects: Effect[];

    /**
     *
     * {@link Memo|Memos} subscribed to signal.
     */

    readonly memos: Memo<unknown>[];

    /**
     * The current value of signal.
     */
    value: T;

    /**
     * The last effect subscribed to signal.
     */

    lastEffect: Effect | null;

    /**
     * The last memo that is subscribed to signal.
     */
    lastMemo: Memo<unknown> | null;
};

/**
 * Function that returns the `value` of a `signal`.
 */

export type GetValue = <T>(signal: Signal<T>) => T;

/**
 *
 *
 *
 * `setValue` or `postSetValue`.
 */
export type SetValue = <T>(signal: Signal<T>, value: T) => T;

export type Effect = {
    /**
     * The main callback.
     *
     * @returns Cleanup of effect or nothing.
     */
    readonly fn: () => Effect['cleanup'] | undefined;

    /**
     *
     * Cleanup of effect. Executed before {@link Effect.fn} and when component unmounts.
     */
    readonly cleanup: (() => void) | void;

    /**
     * `true` when effect is not scheduled to {@link Context.scheduledEffects}.
     */

    isIdle: boolean;
};

/**
 * {@link Memo.fn}.
 */
export type MemoFn<out R> = () => R;

export type Memo<out T> = {
    /**
     * Effects subscribed on memo.
     */

    readonly effects: Effect[];

    /**
     * {@link Memo|Memos} that are subscirbed to the memo.
     */
    readonly memos: Memo<unknown>[];

    /**
     * Called when memo is read.
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
     *
     * The last effect subscribed to memo.
     */

    lastEffect: Effect | null;

    /**
     *
     * The last memo subscribed to memo.
     */

    lastMemo: Memo<unknown> | null;
};
