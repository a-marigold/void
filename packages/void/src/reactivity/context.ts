import type { Context, Flush } from './types';

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
 */
export const flush: Flush = () => {
    const scheduledSubscribers = context.scheduledSubscribers;

    try {
        for (const subscriber of scheduledSubscribers) {
            subscriber();
        }
    } finally {
        context.isScheduled = false;
        scheduledSubscribers.clear();
        context.scheduledDependencies.clear();
    }
};
