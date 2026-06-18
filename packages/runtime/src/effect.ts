import { context } from './context';
import type { Effect } from './types';

/**
 * #### Sets `context.currentEffect` to {@link Effect} with `fn`.
 * #### Calls `fn` argument.
 * #### Sets `context.currentEffect` to `null`.
 *
 *
 * @param fn Function that should be called and subscribed to signals which are used when it is called.
 *
 *
 */

export const createEffect = (fn: Effect['fn']): void => {
	try {
		const effect: Effect = {
			fn,
			cleanup: undefined, //             initialized later
			isIdle: true,
		};

		context.currentEffect = effect;

		const cleanup = fn();

		(effect as Record<string, unknown>).cleanup = cleanup;

		const currentComponent = context.currentComponent;

		if (cleanup && currentComponent) {
			currentComponent.cleanups.push(cleanup);
		}
	} finally {
		context.currentEffect = null;
	}
};
