import { context, scheduleSubscribers } from './context';

import type { Memo, MemoFn } from './types';

/**
 *
 * @param fn
 * @returns
 */
export const createMemo = <T>(fn: MemoFn<T>): Memo<T> => {
    const subscribers: Memo<T>['subscribers'] = new Set();

    const memo: Memo<T> = {
        subscribers,
        fn,
        isDirty: false,
        prevValue: undefined as T, // it is initialized later
    };

    try {
        context.currentSubscriber = {
            fn: () => {
                scheduleSubscribers(subscribers);

                memo.isDirty = true;
            },

            cleanup: undefined,
        };

        memo.prevValue = fn();
    } finally {
        context.currentSubscriber = null;
    }

    return memo;
};
/**
 *
 * @param memo
 * @returns
 */
export const computeMemo = <T>(memo: Memo<T>): T => {
    const currentSubscriber = context.currentSubscriber;

    if (currentSubscriber) {
        memo.subscribers.add(currentSubscriber);
    }

    if (memo.isDirty) {
        try {
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
