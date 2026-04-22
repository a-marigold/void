import { context } from './context';

import type { Memo, MemoFn } from './types';

/**
 * #### Sets {@link context.currentSubscriber} to {@link Memo} with `fn` argument.
 * #### Calls `fn` argument.
 * #### Sets {@link context.currentSubscriber} to `null`.
 *
 * @param fn Function to be called in `computeMemo`.
 * @returns {Memo} {@link Memo} object.
 *
 *
 */

export const createMemo = <T>(fn: MemoFn<T>): Memo<T> => {
    try {
        const memo: Memo<T> = {
            subscribers: [],
            memos: [],
            fn,

            prevValue: null as T, // initialized later

            isDirty: false,

            lastSubscriber: null,
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
 *   If `memo.isDirty` is `false` returns `memo.prevValue`.
 */

export const computeMemo = <T>(memo: Memo<T>): T => {
    const currentSubscriber = context.currentSubscriber;
    const currentMemo = context.currentMemo;

    if (currentSubscriber && memo.lastSubscriber !== currentSubscriber) {
        memo.subscribers.push(currentSubscriber);

        memo.lastSubscriber = currentSubscriber;
    }

    if (currentMemo && memo.lastMemo !== currentMemo) {
        memo.memos.push(currentMemo);

        memo.lastMemo = currentMemo;
    }

    if (memo.isDirty) {
        try {
            // reset currentSubscriber not to subscribe signals and memos that are read in memo.fn
            context.currentSubscriber = null;

            const newValue = memo.fn();

            memo.isDirty = false;

            memo.prevValue = newValue;

            return newValue;
        } finally {
            context.currentSubscriber = currentSubscriber;
        }
    }

    return memo.prevValue;
};
