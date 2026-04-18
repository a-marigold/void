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
        for (const subscriber of subscribers) {
            context.scheduledSubscribers.add(subscriber);
        }

        scheduledDependencies.add(subscribers);
    }
};

// TODO: edge cases testing
