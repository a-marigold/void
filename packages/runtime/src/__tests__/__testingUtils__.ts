import type { Signal, Memo } from '../types';

import { context } from '../context';

/**
 * All the operations with reactivity uses {@link context},
 * so it is needed to be reseted before each test.
 *
 */
export const resetContext = (): void => {
    context.currentEffect = null;

    context.isIdle = true;

    context.scheduledEffects.length = 0;
    context.scheduledDependencies.clear();
};

/**
 * @returns Mocked signal with default properties
 */
export const mockSignal = <T>(
    overrides: Partial<Signal<T>> & { value: Signal<T>['value'] } = { value: null as T },
): Signal<T> => ({
    effects: [],
    memos: [],

    lastEffect: null,

    lastMemo: null,

    ...overrides,
});

/**
 * @returns Mocked memo with default properties.
 */
export const mockMemo = <T>(overrides: Partial<Memo<T>> = {}): Memo<T> => ({
    fn: () => undefined as T,
    prevValue: undefined as T,

    effects: [],
    memos: [],

    isDirty: false,
    lastEffect: null,

    lastMemo: null,

    ...overrides,
});
