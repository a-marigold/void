import type { DelegableEvent, DelegableEventPrefix } from '@void/shared';

/**
 * Object with the current state of reactivity.
 *
 * Used to connect state with effects.
 *
 *
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
	 *
	 *
	 * `true` when `flush` is not scheduled.
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
	 *
	 *
	 *
	 */

	readonly effects: Effect[];

	/**
	 * Memos subscribed to state.
	 */

	readonly memos: Memo<unknown>[];

	/**
	 * Last subscribed to state effect.
	 */
	lastEffect: Effect | null;

	/**
	 * Last subscribed to state memo.
	 */
	lastMemo: Memo<unknown> | null;
};

export type Signal<T = unknown> = {
	/**
	 * The current value of signal.
	 */

	value: T;
} & State;

/**
 *
 * Function that returns the `value` of a signal.
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
	 *
	 */

	isIdle: boolean;
};

export type Memo<T> = {
	/**
	 * Called when memo is read.
	 */

	readonly fn: () => T;

	/**
	 *
	 *
	 * Previous result of {@link Memo.fn}, which is returned by `computeMemo` until {@link Memo.isDirty} is `false`.
	 */

	prevValue: T;

	/**
	 * Indicates does memo need to be recomputed or just {@link Memo.prevValue} should be returned.
	 */

	isDirty: boolean;
} & State;

export type DelegatedEventTarget<T extends DelegableEvent> = HTMLElement & {
	[K in T extends `on${infer E}` ? `${DelegableEventPrefix}${E}` : never]?: (
		event: Event,
	) => void;
};
