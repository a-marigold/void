import { context, scheduleSubscribers } from './context';

import type { Memo, MemoFn } from './types';

/**
 * {@link context.scheduledDependencies}.
 */
const scheduledDependencies = context.scheduledDependencies;

/**
 * #### Sets {@link context.currentSubscriber} to {@link Memo} with `fn` argument.
 * #### Calls `fn` argument.
 * #### Sets {@link context.currentSubscriber} to `null`.
 *
 * @param fn Function to be called in `computeMemo`.
 * @returns {Memo} {@link Memo} object.
 *
 */

export const createMemo = <T>(fn: MemoFn<T>): Memo<T> => {
    const subscribers: Memo<T>['subscribers'] = new Set();
    const memo: Memo<T> = {
        subscribers,
        fn,
        isDirty: false,

        prevValue: null as T, // it is initialized later
        isChanged: true, // initializtion is `true` for correct fisrt cycle of subscribers
    };

    try {
        context.currentSubscriber = {
            fn: () => {
                if (memo.isChanged && !scheduledDependencies.has(subscribers)) {
                    scheduleSubscribers(subscribers);

                    scheduledDependencies.add(subscribers);

                    memo.isDirty = true;
                }
            },
            cleanup: undefined,
            isIdle: true,
            isEager: true,
        };

        memo.prevValue = fn();
    } finally {
        context.currentSubscriber = null;
    }

    return memo;
};

/**
 *
 * @param memo {@link Memo} to be computed.
 *
 *
 * @returns If `memo.isDirty` is `true` returns `memo.fn` call,
 *   If `memo.isDirty` is `false` returns `memo.prevValue`.
 */

export const computeMemo = <T>(memo: Memo<T>): T => {
    const currentSubscriber = context.currentSubscriber;

    if (currentSubscriber) {
        memo.subscribers.add(currentSubscriber);
    }

    if (memo.isDirty) {
        try {
            // reset currentSubscriber not to subscribe signals and memos that are read in memo.fn
            context.currentSubscriber = null;

            const newValue = memo.fn();

            memo.isDirty = false;

            memo.isChanged = newValue !== memo.prevValue;

            memo.prevValue = newValue;

            return newValue;
        } finally {
            context.currentSubscriber = currentSubscriber;
        }
    }

    return memo.prevValue;
};
