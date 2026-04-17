import { context, scheduleSubscribers } from './context';

import type { Memo, MemoFn } from './types';

export const createMemo = <T>(fn: MemoFn<T>): Memo<T> => {
    const subscribers: Memo<T>['subscribers'] = new Set();

    const memo: Memo<T> = {
        subscribers,
        fn,
        isDirty: false,
    };

    try {
        context.currentSubscriber = {
            fn: () => {
                scheduleSubscribers(
                    subscribers,
                    context.scheduledSubscribers,
                    context.scheduledDependencies,
                );

                memo.isDirty = true;
            },

            cleanup: undefined,
        };

        fn();
    } finally {
        context.currentSubscriber = null;
    }
    return memo;
};
