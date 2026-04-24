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
};

/**
 *
 * Basic type of `signal` or `memo`.
 */
export type State = {
    /**
     * Effects subscribed to state.
     */

    readonly effects: Effect[];

    /**
     * Memos subscribed tp state.
     */

    readonly memos: Memo<unknown>[];

    /**
     *
     * Last subscribed tp state effect.
     */
    lastEffect: Effect | null;

    /**
     * Last subscribed tp state memo.
     */
    lastMemo: Memo<unknown> | null;
};

export type Signal<T = unknown> = {
    /**
     * The current value of signal.
     *
     *
     *
     *
     */

    value: T;
} & State;

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
     *
     * `true` when effect is not scheduled to {@link Context.scheduledEffects}.
     */

    isIdle: boolean;
};

/**
 * {@link Memo.fn}.
 */
export type MemoFn<out R> = () => R;

export type Memo<T> = {
    /**
     * Called when memo is read.
     */

    readonly fn: MemoFn<T>;

    /**
     *
     *
     * Previous result of {@link Memo.fn}, which is returned by `computeMemo` until {@link Memo.isDirty} is `false`.
     */

    prevValue: T;

    /**
     *
     * Indicates is memo needs to be recomputed or just {@link Memo.prevValue} should be returned.
     *
     *
     *
     */
    isDirty: boolean;
} & State;
