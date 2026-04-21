// TODO: UPDATE DOCS !!!!!!

import type { Context, Subscriber, Memo } from './types';

/**
 *
 * Object that contains the current state of reactivity.
 *
 * Used to connext state with effects.
 */
export const context: Context = {
    currentSubscriber: null,

    currentMemo: null,

    isIdle: true,

    scheduledSubscribers: [],

    scheduledDependencies: new Set(), // TODO: delete
};

/**
 * {@link context.scheduledSubscribers}.
 */
const scheduledSubscribers = context.scheduledSubscribers;
/**
 * {@link context.scheduledDependencies}.
 */
const scheduledDependencies = context.scheduledDependencies;

/**
 *
 * #### Runs all {@link context.scheduledSubscribers} and sets {@link context.isIdle} to `false`.
 * #### Clears all the context properties in the end.
 *
 * @example
 * ```typescript
 * context.scheduledSubscribers.add(() => { console.log('run'); });
 * flush(); // There will be 'run' in console
 * ```
 */

export const flush = (): void => {
    try {
        let subIndex = 0;

        while (subIndex < scheduledSubscribers.length) {
            const subscriber = scheduledSubscribers[subIndex];

            subscriber.cleanup?.();
            subscriber.fn();

            subIndex++;
        }
    } finally {
        context.isIdle = false;
        scheduledSubscribers.length = 0;
        scheduledDependencies.clear();
    }
};

/**
 * #### For every subscriber - Calls {@link Subscriber.fn} if {@link Subscriber.isEager} is `true`, otherwise adds subscriber to {@link context.scheduledSubscribers}.
 *
 * @param subscribers Subscribers of `signal` or `memo`.
 *
 *
 *
 *
 */

export const scheduleSubscribers = (subscribers: Set<Subscriber>): void => {
    for (const subscriber of subscribers) {
        if (subscriber.isIdle) {
            scheduledSubscribers.push(subscriber);

            subscriber.isIdle = false;
        }
    }
};

// TODO: edge cases testing

/**
 *
 * #### Makes all memos dirty, schedules their `subscribers` and prepares their `memos` recursively.
 *
 * @param memos `memos` of `signal` or `memo`.
 */
export const prepareMemos = (memos: Set<Memo<unknown>>): void => {
    for (const memo of memos) {
        const subscribers = memo.subscribers;

        if (!scheduledDependencies.has(subscribers)) {
            scheduleSubscribers(memo.subscribers);
            scheduledDependencies.add(subscribers);
        }

        memo.isDirty = true;

        prepareMemos(memo.memos);
    }
};
