import { ComponentSubsOffset } from './constants';
import type { Context, Effect, Memo, State } from './types';

/**
 *
 * Object that contains the current state of reactivity.
 *
 * Used to connext state with effects.
 */
export const context: Context = {
	currentEffect: null,

	currentMemo: null,

	currentComponent: null,

	isIdle: true,

	scheduledEffects: [],
};

/**
 *
 * {@link context.scheduledEffects}.
 */

const scheduledEffects = context.scheduledEffects;

/**
 *
 * #### Runs all {@link context.scheduledEffects} and sets {@link context.isIdle} to `false`.
 *
 * #### Clears all the context properties.
 *
 *
 *      @example
 *
 * ```typescript
 * context.scheduledSubscribers.push(() => { console.log('run'); });
 *
 * flush(); //  'run' in console
 * ```
 */

export const flush = (): void => {
	// TODO: when an error appears it does not reset `isIdle` of effects

	try {
		let subIndex = 0;

		// Not caching `length` 'cause effects can be added dynamically
		while (subIndex < scheduledEffects.length) {
			const effect = scheduledEffects[subIndex];

			effect.cleanup?.();

			effect.fn();

			effect.isIdle = true;

			subIndex++;
		}
	} finally {
		context.isIdle = true;
		scheduledEffects.length = 0;
	}
};

/**
 *
 *
 *
 * #### Calls `fn` for every effect of `effects`.
 *
 * @param effects `effects` of `signal` or `memo`.
 */

export const scheduleEffects = (effects: Effect[]): void => {
	const subsLength = effects.length;

	let subIndex = 0;

	while (subIndex < subsLength) {
		const effect = effects[subIndex];

		if (effect.isIdle) {
			scheduledEffects.push(effect);

			effect.isIdle = false;
		}

		subIndex++;
	}
};

/**
 *
 * #### Makes all memos Dirty, schedules their `effects` and prepares their `memos` recursively.
 *
 * @param memos `memos` of `signal` or `memo`.
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */

export const prepareMemos = (memos: Memo<unknown>[]): void => {
	const memosLength = memos.length;

	for (let memoIndex = 0; memoIndex < memosLength; memoIndex++) {
		const memo = memos[memoIndex];

		if (memo.isDirty) {
			continue;
		}

		memo.isDirty = true;
		scheduleEffects(memo.effects);
		prepareMemos(memo.memos);
	}
};

/**
 * #### Subscribes {@link context.currentEffect} or {@link context.currentMemo} to `state`.
 * #### If {@link context.currentComponent} is not {@link state.ownerComponent}, adds subscribed effect or memo to `currentComponent.subs`.
 *
 * @param state Signal or Memo to which subscribe {@link context.currentEffect} or {@link context.currentMemo};
 */
export const subscribeContextToState = (state: State): void => {
	const currentEffect = context.currentEffect;

	const currentMemo = context.currentMemo;

	if (currentEffect && state.lastEffect !== currentEffect) {
		const effects = state.effects;

		effects.push(currentEffect);

		state.lastEffect = currentEffect;

		const currentComponent = context.currentComponent;

		if (currentComponent && state.ownerComponent !== currentComponent) {
			const subs = currentComponent.subs;

			const effectsIndex = subs.indexOf(effects);

			if (effectsIndex === -1) {
				subs.push(effects, currentEffect, 1);
			} else {
				(subs[effectsIndex + ComponentSubsOffset.SubsQuantity] as number)++;
			}
		}
	} else if (currentMemo && state.lastMemo !== currentMemo) {
		const memos = state.memos;

		memos.push(currentMemo);

		state.lastMemo = currentMemo;

		const currentComponent = context.currentComponent;
		if (currentComponent && state.ownerComponent !== currentComponent) {
			const subs = currentComponent.subs;

			const memoIndex = subs.indexOf(memos);

			if (memoIndex === -1) {
				subs.push(memos, currentMemo, 1);
			} else {
				(subs[memoIndex + ComponentSubsOffset.SubsQuantity] as number)++;
			}
		}
	}
};
