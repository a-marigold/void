import type { Context } from './types';

/**
 *
 * Object that contains the current state of reactive logic.
 *
 * Used to connect signals and computations.
 *
 * @property {Subscriber} currentSubscriber - The current callback from `effect` or `computation`.
 * @property {boolean} scheduled - Flag that is used to identify is there a scheduled {@link batch} function call.
 */

export const context: Context = {
    currentSubscriber: null,

    scheduled: false,
};

export const batch = () => {};

// TODO: commit context
