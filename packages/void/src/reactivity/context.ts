import type { Context, Batch } from './types';

/**
 *
 * Object that contains the current state of reactive logic.
 *
 * Used to connect signals and computations.
 *
 * @property {Subscriber} currentSubscriber - The current callback from `effect` or `computation`.
 *
 * @property {boolean} isScheduled - Flag that is used to identify is there a scheduled {@link batch} function call.
 * @property {Set<Subscriber>} scheduledSubscribers - `Set` with functions (subscribers from `effect` or `computation`) that are needed to be run.
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */
export const context: Context = {
    currentSubscriber: null,

    isScheduled: false,

    scheduledSubscribers: new Set(),
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
