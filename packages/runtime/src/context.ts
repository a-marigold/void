// TODO: UPDATE DOCS !!!!!!

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
 *
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
 */

export const scheduleSubscribers = (subscribers: Set<Subscriber>): void => {
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
