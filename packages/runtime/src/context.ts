import type { Context, Subscriber } from './types';

/**
 *
 * Object that contains the current state of reactive logic.
 *
 * Used to connect signals with computations.
 */
export const context: Context = {
    currentSubscriber: null,

    isScheduled: false,

    scheduledSubscribers: new Set(),

    scheduledDependencies: new Set(),
};

/**
 *
 * #### Runs all {@link context.scheduledSubscribers} and sets {@link context.isScheduled} to `false`.
 *
 * #### Used to batch `Signal.subscribers` with `queueMicrotask`.
 *
 * @example
 * ```typescript
 * context.scheduledSubscribers.add(() => { console.log('run'); });
 * flush(); // There will be 'run' in console
 * ```
 *
 *
 *
 *
 *
 */
export const flush = (): void => {
    const scheduledSubscribers = context.scheduledSubscribers;

    try {
        for (const subscriber of scheduledSubscribers) {
            subscriber.cleanup?.();

            subscriber.fn();
        }
    } finally {
        context.isScheduled = false;

        scheduledSubscribers.clear();

        context.scheduledDependencies.clear();
    }
};

/**
 *
 * #### If sheduled dependencies do not have `scheduledDependencies`, Adds every subscriber of `subscribers` to `scheduledSubscribers` and adds `subscribers` to `scheduledDependencies`.
 * #### Used after state update.
 *
 * @param subscribers `signal.subscribers`.
 * @param scheduledSubscribers The {@link context.scheduledSubscribers}.
 * @param scheduledDependencies The {@link context.scheduledDependencies}.
 *
 *
 */
export const scheduleSubscribers = (
    subscribers: Set<Subscriber>,
    scheduledSubscribers: Context['scheduledSubscribers'],
    scheduledDependencies: Context['scheduledDependencies'],
) => {
    if (!scheduledDependencies.has(subscribers)) {
        for (const subscriber of subscribers) {
            scheduledSubscribers.add(subscriber);
        }

        scheduledDependencies.add(subscribers);
    }
};
