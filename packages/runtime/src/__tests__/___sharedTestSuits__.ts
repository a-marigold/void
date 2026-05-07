import { it, expect } from 'bun:test';

import { context } from '../context';
import type { State } from '../types';

import { mockMemo } from './__testingUtils__';

/**
 * Tests state getter interaction with subscribers.
 *
 * @param getter Getter of signal or memo to be teseted.
 * @param stateMocker `mockSignal` or `mockMemo`.
 */
export const testStateGetter = <T extends State>(
	getter: (state: T) => unknown,
	stateMocker: () => T,
): void => {
	it('should add `context.currentEffect` to `effects` and to `lastEffect` of state', () => {
		context.currentEffect = { fn: () => {}, cleanup: undefined, isIdle: true };

		const state = stateMocker();

		getter(state);

		expect(state.effects).toContain(context.currentEffect);
		expect(state.lastEffect).toBe(context.currentEffect);
	});

	it('should add `context.currentMemo` to `memos` and to `lastMemo` of state', () => {
		context.currentMemo = mockMemo({});
		const state = stateMocker();

		getter(state);

		expect(state.memos).toContain(context.currentMemo);
		expect(state.lastMemo).toBe(context.currentMemo);
	});

	it('should not subscribe `context.currentEffect` and `context.currentMemo` to state if called multiple times with the same ones', () => {
		context.currentEffect = { fn: () => {}, cleanup: undefined, isIdle: true };

		context.currentMemo = mockMemo({});

		const state = stateMocker();

		state.effects.length = 0;
		state.memos.length = 0;

		getter(state);

		getter(state);

		getter(state);

		expect(state.effects.length).toBe(1);

		expect(state.memos.length).toBe(1);
	});
};
