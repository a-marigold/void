import { context } from './context';
import type { Memo } from './types';

/**
 * #### Sets {@link context.currentEffect} to {@link Memo} with `fn` argument.
 * #### Calls `fn` argument.
 * #### Sets {@link context.currentEffect} to `null`.
 *
 * @param fn Function to be called in `computeMemo`.
 * @returns {Memo} {@link Memo} object.
 *
 *
 */

export const createMemo = <T>(fn: Memo<T>['fn']): Memo<T> => {
	try {
		const memo: Memo<T> = {
			fn,
			prevValue: null as T, // initialized later
			isDirty: false,

			effects: [],
			memos: [],

			lastEffect: null,
			lastMemo: null,
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
 */

export const computeMemo = <T>(memo: Memo<T>): T => {
	const currentEffect = context.currentEffect;

	const currentMemo = context.currentMemo;

	if (currentEffect && memo.lastEffect !== currentEffect) {
		memo.effects.push(currentEffect);

		memo.lastEffect = currentEffect;
	}

	if (currentMemo && memo.lastMemo !== currentMemo) {
		memo.memos.push(currentMemo);

		memo.lastMemo = currentMemo;
	}

	if (memo.isDirty) {
		try {
			// reseting not to subscribe signals and memos to currentEffect that are read in memo.fn
			context.currentEffect = null;

			context.currentMemo = null;

			const newValue = memo.fn();

			memo.prevValue = newValue;

			memo.isDirty = false;

			return newValue;
		} finally {
			context.currentEffect = currentEffect;

			context.currentMemo = currentMemo;
		}
	}

	return memo.prevValue;
};
