import type { DelegatedEventProp } from '@void/shared';

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
	 * The current {@link Component} with running component `fn`.
	 */
	currentComponent: Component | null;

	/**
	 *
	 * `true` when `flush` is not scheduled.
	 */

	isIdle: boolean;

	/**
	 * Effects that are run in `flush` function.
	 */

	readonly scheduledEffects: Effect[];
};

// TODO: make `State` private
/**
 *
 * Basic type of `signal` and `memo`
 */

export type State = {
	/**
	 * Last subscribed to state effect.
	 */
	lastEffect: Effect | null; // TODO: it is needed to be reseted after `flush`.

	/**
	 * Last subscribed to state memo.
	 */
	lastMemo: Memo<unknown> | null;

	/**
	 * Initialized once when state is created.
	 *
	 * When it is `null`, state created in global scope.
	 */
	readonly ownerComponent: Component | null;

	/**
	 * Effects subscribed to state.
	 *
	 *
	 *
	 *
	 *
	 *
	 *
	 */

	readonly effects: Effect[];

	/**
	 *
	 * Memos subscribed to state.
	 */

	readonly memos: Memo<unknown>[];
};

export type Signal<T> = {
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
 *
 * `setValue` or `postSetValue`.
 */

export type SetValue = <T>(signal: Signal<T>, value: T) => T;

export type Cleanup = () => void;

export type Effect = {
	/**
	 * The main callback.
	 *
	 * @returns Cleanup of effect or nothing.
	 */
	readonly fn: () => Cleanup | void;

	/**
	 *
	 *
	 * Cleanup of effect. Executed before {@link Effect.fn} and when component unmounts.
	 */

	readonly cleanup: Cleanup | void;

	/**
	 *
	 * `true` when effect is not scheduled to {@link Context.scheduledEffects}.
	 *
	 */

	isIdle: boolean;
};

export type Memo<T> = {
	/**
	 *
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

export type DelegatedEventTarget<T extends DelegatedEventProp> = HTMLElement & {
	[K in T]?: (event: Event) => void;
};

/**
 * Type of expressions that can be inserted to DOM of components.
 */

export type Child = string | number | false | null | undefined | Element | DocumentFragment;

type Sub = Effect | Memo<unknown>;

type StateSubs = State['effects'] | State['memos'];

/**
 *
 */
export type Scope = {
	/**
	 * Contains only {@link StateSubs} of external state from component props or global scope.
	 *
	 * The order (multiples of 1,2,3 elements of `subs`):
	 * 1. **Subscribers array** ({@link StateSubs}).
	 * 2. **The first subscribed** {@link Sub} to **Subscribers array** during component `fn` execution.
	 * 3. **Quantity of elements** of **Subscribers array** to be deleted.
	 *
	 *
	 * To clear all subscribers of **Subscribers array** subscribed during component `fn` execution,
	 *
	 * delete all elements from **The first subscriber** index to **The first subscriber** index + **Quanitity of elements**.
	 */
	subs: (StateSubs | Sub | number)[];

	/**
	 * Nested components of scope.
	 */

	components: Component[];
};

export type ComponentFn = <P extends HTMLElementTagNameMap[keyof HTMLElementTagNameMap]>(
	children: Child,

	props: P,
) => Child;

export type Component = {
	/**
	 *
	 * Cleanups of effects nested in component to be called on unmount.
	 */

	cleanups: Cleanup[];
} & Scope;
