import { context } from '../context';
import type { Signal, Memo } from '../types';

/**
 * All the operations with reactivity uses {@link context},
 * so it is needed to be reseted before each test.
 *
 */

export const resetContext = (): void => {
	context.currentEffect = null;

	context.isIdle = true;

	context.scheduledEffects.length = 0;
};

/**
 * @returns Mocked signal with default properties
 *
 *
 *
 *
 *
 */
export const mockSignal = <T>(overrides?: Partial<Signal<T>>): Signal<T> => ({
	value: null as T,

	lastEffect: null,
	lastMemo: null,

	ownerComponent: null,

	effects: [],
	memos: [],

	...overrides,
});

/**
 *
 * @returns Mocked memo with default properties (`isDirty` is set to `false`).
 */
export const mockMemo = <T>(overrides?: Partial<Memo<T>>): Memo<T> => ({
	fn: () => undefined as T,
	prevValue: undefined as T,

	isDirty: false,

	lastEffect: null,

	lastMemo: null,

	ownerComponent: null,

	effects: [],
	memos: [],

	...overrides,
});
