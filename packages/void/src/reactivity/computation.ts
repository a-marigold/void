import { context } from './context';

import type { CreateComputation, Compute } from './types';

/**
 *
 *
 *
 * @param computer
 *
 * @returns
 *
 *
 *
 *
 * @example
 *
 *
 * ```typescript
 * const count: Signal<number> = {
 *   subscribers: new Set(),
 *
 *   value: 0,
 * };
 *
 * const multiplied = createComputation(() => get(count) * 10);
 *
 * console.log(multiplied.computer());
 * ```
 */
export const createComputation: CreateComputation = (computer) => {
    context.currentSubscriber = computer;

    try {
        computer();
    } finally {
        context.currentSubscriber = null;
    }
    return { subscribers: new Set(), computer };
};

/**
 *
 *
 *
 *
 * @param computation
 *
 *
 *
 * @returns
 *
 */
export const compute: Compute = (computation) => {
    const currentSubscriber = context.currentSubscriber;

    if (currentSubscriber) {
        computation.subscribers.add(currentSubscriber);
    }

    return computation.computer();
};
