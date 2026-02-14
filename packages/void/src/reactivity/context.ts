import type { Context, Batch } from './types';

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
 * batch(); // There will be 'run' in console
 * ```
 *
 *
 *
 */
export const batch: Batch = () => {
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
