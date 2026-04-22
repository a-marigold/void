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
    context.currentEffect = null;

    context.isIdle = true;

    context.scheduledEffects.length = 0;

    context.scheduledDependencies.clear();
};
