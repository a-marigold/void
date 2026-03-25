import { context, scheduleSubscribers } from './context';

import type { CreateComputation, Compute, Subscriber } from './types';

/**
 *
 * #### Updates `context.currentSubscriber`.
 * #### Calls `computer` argument.
 * #### Sets `context.currentSubscriber` to `null`.
 * #### Returns an object with `subscribers` and `computer` from `computer` argument.
 *
 * @param computer Function that will be subscribed on signals or other computations which were run while this was executing.
 *
 *
 *
 * @returns Object with `subscribers` and `computer` properties.
 *
 *
 *
 *
 * @example
 *
 * ```typescript
 * const count: Signal<number> = {
 *   subscribers: new Set(),
 *
 *   value: 0,
 * };
 *
 * const multiplied = createComputation(() => getValue(count) * 10); // `getValue` from signal module subscribes the computation on `count` signal
 *
 * console.log(multiplied.computer());
 * ```
 *
 */

export const createComputation: CreateComputation = (computer) => {
    const subscribers = new Set<Subscriber>();

    const scheduleComputation = () => {
        scheduleSubscribers(
            subscribers,
            context.scheduledSubscribers,
            context.scheduledDependencies,
        );
    };

    context.currentSubscriber = scheduleComputation;

    try {
        computer();
    } finally {
        context.currentSubscriber = null;
    }

    return { subscribers, computer };
};

/**
 *
 *
 * #### Adds `context.currentSubscriber` to `computation.subscribers`.
 * #### Returns a call of `computation.computer`.
 *
 * @param computation Object with `subscribers` and `computer` to be computed.
 *
 *
 * @returns A call of `computation.computer`.
 *
 * @example
 *
 *
 *
 * ```typescript
 * const count: Singal<number> = {
 *   subscribers: new Set(),
 *
 *   value: 0,
 * };
 *
 *
 * const doubled = createComputation(() => getValue(count) * 2); // `getValue` from signal module subscribes this computation on `count` signal
 *
 * createEffect(() => {
 *   console.log(compute(doubled)); // This subscribes the effect on `doubled`
 * });
 * ```
 *
 *
 */
export const compute: Compute = (computation) => {
    const currentSubscriber = context.currentSubscriber;

    if (currentSubscriber) {
        computation.subscribers.add(currentSubscriber);
    }

    return computation.computer();
};
