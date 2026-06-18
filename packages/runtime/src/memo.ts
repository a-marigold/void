import { context, subscribeContextToState } from './context';
import type { Memo } from './types';

/**
 *
 * #### Sets {@link context.currentMemo} to {@link Memo} with `fn`.
 * #### Calls `fn` argument.
 * #### Sets {@link context.currentMemo} to `null`.
 *
 * @param fn Function to be called in `computeMemo`.
 * @returns {Memo} {@link Memo} with `ownerComponent` set to {@link context.currentComponent}.
 *
 *
 */

export const createMemo = <T>(fn: Memo<T>['fn']): Memo<T> => {
	try {
		const memo: Memo<T> = {
			fn,
			prevValue: null as T, // initialized later
			isDirty: false,

			lastEffect: null,
			lastMemo: null,

			ownerComponent: context.currentComponent,

			effects: [],
			memos: [],
		};

		context.currentMemo = memo;

		memo.prevValue = fn();

		return memo;
	} finally {
		context.currentMemo = null;
	}
};

/**
 * @param memo {@link Memo} to be computed.
 *
 *
 * @returns If `memo.isDirty` is `true` returns `memo.fn` call,
 *
 *   If `memo.isDirty` is `false` returns `memo.prevValue`.
 *
 *
 *
 *
 *
 *
 *
 */

export const computeMemo = <T>(memo: Memo<T>): T => {
	subscribeContextToState(memo);

	if (memo.isDirty) {
		const parentEffect = context.currentEffect;
		const parentMemo = context.currentMemo;

		// Reset not to subscribe signals and memos read in memo.fn to `context.currentEffect`
		context.currentEffect = null;
		context.currentMemo = null;

		try {
			const newValue = memo.fn();

			memo.prevValue = newValue;
			memo.isDirty = false;

			return newValue;
		} finally {
			context.currentEffect = parentEffect;

			context.currentMemo = parentMemo;
		}
	}

	return memo.prevValue;
};
