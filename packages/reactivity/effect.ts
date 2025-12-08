import type { Effect } from './types/Computation';

import { withComputation } from './context';

export const effect = (fn: Effect['fn']) => {
    withComputation({ fn });
};
