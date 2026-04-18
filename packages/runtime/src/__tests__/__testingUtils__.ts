import { context } from '../context';

/**
 *
 *
 *
 *
 * All the operations with reactivity uses {@link context},
 *
 * so it is needed to be reseted before each test.
 *
 */
export const resetContext = (): void => {
    context.currentSubscriber = null;

    context.isScheduled = false;

    context.scheduledSubscribers.clear();

    context.scheduledDependencies.clear();
};
