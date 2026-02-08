import type { Subscriber } from './types';

/**
 *
 *
 * @property {Subscriber} subscriber Current callback from `computation` of `effect`
 */
export const currentComputation: { subscriber: Subscriber | null } = {
    subscriber: null,
};
