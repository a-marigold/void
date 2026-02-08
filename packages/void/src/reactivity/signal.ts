import type { GetValue, SetValue } from './types';

import { currentComputation } from './context';

/**
 * #### Returns the `value` of provided `signal`.
 *
 *
 * @param signal `Signal` object to be read.
 *
 * @returns The `signal.value`.
 */
export const get: GetValue = (signal) => {
    const currentSubscriber = currentComputation.subscriber;

    if (currentSubscriber) {
        signal.subscribers.add(currentSubscriber);
    }

    return signal.value;
};
