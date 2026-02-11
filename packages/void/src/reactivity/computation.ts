import { context } from './context';

import type { Subscriber, CreateComputation } from './types';

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
    const subscribers = new Set<Subscriber>();

    const currentSubscriber = context.currentSubscriber;

    if (currentSubscriber) {
        subscribers.add(currentSubscriber);

        const subscriberStack = context.subscriberStack;

        subscriberStack[subscriberStack.length] = currentSubscriber;
    }

    context.currentSubscriber = computer;

    computer();

    context.currentSubscriber = null;

    return { subscribers, computer };
};
