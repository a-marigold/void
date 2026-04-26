// TODO: UPDATE DOCS !!!!!!

import type { Context, Effect, Memo } from './types';

/**
 *
 * Object that contains the current state of reactivity.
 *
 * Used to connext state with effects.
 */
export const context: Context = {
    currentEffect: null,

    currentMemo: null,

    isIdle: true,

    scheduledEffects: [],
};

/**
 * {@link context.scheduledEffects}.
 */
const scheduledEffects = context.scheduledEffects;

/**
 *
 * #### Runs all {@link context.scheduledEffects} and sets {@link context.isIdle} to `false`.
 * #### Clears all the context properties in the end.
 *
 *
 *      @example
 *
 * ```typescript
 * context.scheduledSubscribers.add(() => { console.log('run'); });
 * flush(); // There will be 'run' in console
 * ```
 */

export const flush = (): void => {
    try {
        let subIndex = 0;

        while (subIndex < scheduledEffects.length) {
            const effect = scheduledEffects[subIndex];

            effect.cleanup?.();
            effect.fn();

            subIndex++;
        }
    } finally {
        context.isIdle = true;
        scheduledEffects.length = 0;
    }
};

/**
 * #### Calls `fn` for every effect of effects.
 *
 *
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

// TODO: edge cases testing

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
