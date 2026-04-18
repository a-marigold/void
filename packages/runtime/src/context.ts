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

    scheduledSubscribers: [],

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
 * #### Adds every subscriber of `subscribers` to {@link context.scheduledSubscribers} and `subscribers` to {@link context.scheduledDependencies}.
 * #### Does nothing if `subscribers` are already in {@link context.scheduledDependencies}.
 * #### Used after state update.
 *
 *
 * @param subscribers Subscribers of `signal` or `memo`.
 *
 *
 */
export const scheduleSubscribers = (subscribers: Subscriber[]): void => {
    const scheduledDependencies = context.scheduledDependencies;

    if (!scheduledDependencies.has(subscribers)) {
        const scheduledSubscribers = context.scheduledSubscribers;
        const subsLength = subscribers.length;

        let subIndex = 0;
        while (subIndex < subsLength) {
            const subscriber = subscribers[subIndex];
            if (subscriber.isIdle) {
                scheduledSubscribers.push(subscribers[subIndex]);

                subscriber.isIdle = false;
            }

            subIndex++;
        }

        scheduledDependencies.add(subscribers);
    }
};

// TODO: edge cases testing
