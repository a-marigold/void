import { context, flush, scheduleEffects, prepareMemos, subscribeContextToState } from './context';
import type { Signal, GetValue, SetValue } from './types';

/**
 *
 * @param initValue Initial value of signal.
 *
 * @returns {Signal} {@link Signal} with `ownerComponent` set to {@link context.currentScope}.
 */

export const createSignal = <T>(initValue: Signal<T>['value']): Signal<T> => ({
	value: initValue,
	lastEffect: null,
	lastMemo: null,
	ownerScope: context.currentScope,
	effects: [],
	memos: [],
});

/**
 * @param signal `Signal` object to be read.
 *
 * @returns `value` of provided `signal`.
 *
 * @example
 * ```typescript
 * const count: Signal<number> = {
 *   value: 1616,
 *   ...
 * };
 * getValue(count); // This returns 1616
 * ```
 */

export const getValue: GetValue = (signal) => {
	subscribeContextToState(signal);

	return signal.value;
};

/**
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 * #### Assigns `value` argument to `signal.value`.
 * #### Schedules `signal.subscribers`.
 * #### Makes all `signal.memos` dirty.
 *
 *
 * @param signal `Signal`, `value` property of which will be changed.
 * @param value New value to assign to `signal.value`.
 *
 * @returns Assigned value to `signal`.
 *
 * @example
 *
 * ```typescript
 * const count: Signal<number> = {
 *      value: 0,
 * }
 *
 * setValue(count, 1); // Returns 1
 * ```
 *
 * @example
 *
 * ```typescript
 * const name: Signal<string> = {
 *   value: 'abc',
 * };
 *
 * setValue(name, 'b'); // Returns 'b' and sets 'b' to `name.value`
 * ```
 *
 *
 *
 */
export const setValue: SetValue = (signal, value) => {
	if (signal.value !== value) {
		signal.value = value;

		if (context.isIdle) {
			queueMicrotask(flush);
			context.isIdle = false;
		}

		scheduleEffects(signal.effects);
		prepareMemos(signal.memos);
	}

	return value;
};

/**
 *
 *
 * #### Does all things {@link setValue} does, but returns the previous value of signal.
 *
 * @param signal `Signal`, `value` property of which will be updated.
 *
 * @param value New value to be assigned to `signal`.
 *
 * @returns The previous `value` of `signal`.
 *
 * @example
 *
 *
 * ```typescript
 * const count: Signal<number> = {
 *      value: 0,
 *     ...
 * };
 *
 * postSetValue(count, 1); // Returns 0 and sets 1 to `count.value`.
 * ```
 */

export const postSetValue: SetValue = (signal, value) => {
	const prevValue = signal.value;

	if (prevValue !== value) {
		signal.value = value;

		if (context.isIdle) {
			queueMicrotask(flush);

			context.isIdle = false;
		}

		scheduleEffects(signal.effects);

		prepareMemos(signal.memos);
	}

	return prevValue;
};
