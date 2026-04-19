import type { Context, Subscriber } from './types';

/**
 *
 * Object that contains the current state of reactivity.
 *
 * Used to connext state with effects.
 */
export const context: Context = {
    currentSubscriber: null,

    isIdle: true,

    scheduledSubscribers: [],

    scheduledDependencies: new Set(),
};

/**
 *
 * #### Runs all {@link context.scheduledSubscribers} and sets {@link context.isIdle} to `false`.
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

        context.scheduledDependencies.clear();
    }
};

/**
 * #### For every subscriber - Calls {@link Subscriber.fn} if {@link Subscriber.isEager} is `true`, otherwise adds subscriber to {@link context.scheduledSubscribers}.
 *
 * @param subscribers Subscribers of `signal` or `memo`.
 */

export const scheduleSubscribers = (subscribers: Set<Subscriber>): void => {
    const scheduledSubscribers = context.scheduledSubscribers;

    for (const subscriber of subscribers) {
        if (subscriber.isIdle) {
            if (subscriber.isEager) {
                try {
                    subscriber.fn();
                } finally {
                    subscriber.isIdle = false;
                }
            } else {
                scheduledSubscribers.push(subscriber);

                subscriber.isIdle = false;
            }
        }
    }
};

// TODO: edge cases testing
