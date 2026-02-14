import { context } from '../context';

/**
 *
 *
 * Resets all the {@link context} properties to their initial values
 *
 */
export const resetContext = (): void => {
    context.currentSubscriber = null;

    context.isScheduled = false;

    context.scheduledSubscribers.clear();

    context.scheduledDependencies.clear();
};
