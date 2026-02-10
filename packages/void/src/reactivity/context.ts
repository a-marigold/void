import type { Context, Batch } from './types';

/**
 *
 * Object that contains the current state of reactive logic.
 *
 * Used to connect signals and computations.
 */
export const context: Context = {
    currentSubscriber: null,

    isScheduled: false,

    scheduledSubscribers: new Set(),

    scheduledSignals: new Set(),
};

/**
 *
 * #### Runs all {@link context.scheduledSubscribers} and sets {@link context.isScheduled} to `false`.
 *
 * #### Used to batch `Signal.subscribers` with `queueMicrotask`.
 *
 * @example
 * ```typescript
 * // `context.scheduledSubscribers` is `new Set(() => { console.log('run'); });`
 * batch(); // There will be 'run' in console
 * ```
 *
 *
 */
export const batch: Batch = () => {
    const scheduledSubscribers = context.scheduledSubscribers;

    for (const subscriber of scheduledSubscribers) {
        subscriber();
    }

    context.isScheduled = false;
};
