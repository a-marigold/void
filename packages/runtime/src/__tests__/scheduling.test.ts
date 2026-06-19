import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { ComponentSubsOffset } from '../constants';
import { context, flush, scheduleEffects, prepareMemos, subscribeContextToState } from '../context';
import type { State, Memo, Effect } from '../types';

import { resetContext, mockMemo } from './__testingUtils__';

beforeEach(resetContext);

describe('flush', () => {
	it('should run `fn` and `cleanup` of every effect of `context.scheduledEffects`', () => {
		const effects: Effect[] = [
			{ fn: vi.fn(), cleanup: vi.fn(), isIdle: false },
			{ fn: vi.fn(), cleanup: vi.fn(), isIdle: false },
		];
		context.isIdle = false;
		context.scheduledEffects.push(...effects); // Copy 'cause `scheduledEffects` are reseted

		flush();

		for (const effect of effects) {
			expect(effect.fn).toHaveBeenCalledTimes(1);
			expect(effect.cleanup).toHaveBeenCalledTimes(1);
		}
	});

	it('should clear `context` object properties when effects are run', () => {
		context.isIdle = false;

		context.scheduledEffects.push(
			{ fn: () => {}, cleanup: undefined, isIdle: false },

			{ fn: () => {}, cleanup: undefined, isIdle: false },
		);

		flush();

		expect(context.isIdle).toBe(true);

		expect(context.scheduledEffects.length).toBe(0);
	});

	it('should set `isIdle` of every effect to `true`', () => {
		context.isIdle = false;

		const effects: Effect[] = [
			{ fn: () => {}, cleanup: undefined, isIdle: false },
			{ fn: () => {}, cleanup: undefined, isIdle: false },
		];

		context.scheduledEffects.push(...effects);

		flush();

		for (const effect of effects) {
			expect(effect.isIdle).toBe(true);
		}
	});

	it('should clear `context` object properties and pass error when there are uncaught errors inside effects', () => {
		const err = new Error();

		context.isIdle = false;

		context.scheduledEffects.push(
			{
				fn: () => {
					throw err;
				},

				cleanup: undefined,

				isIdle: false,
			},

			{
				fn: () => {
					throw err;
				},

				cleanup: undefined,

				isIdle: false,
			},
		);

		expect(() => flush()).toThrowError(err);

		expect(context.isIdle).toBe(true);

		expect(context.scheduledEffects.length).toBe(0);
	});

	it('should run effect `cleanup` before `fn`', () => {
		let val: 'fn' | 'cleanup' | '' = '';

		const cleanup = vi.fn(() => {
			val = 'cleanup';
		});

		const fn = vi.fn(() => {
			val = 'fn';
		});

		context.isIdle = false;
		context.scheduledEffects.push({
			fn,
			cleanup,
			isIdle: false,
		});

		flush();

		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledTimes(1);

		expect(val).toBe('fn' as typeof val);
	});
});

describe('scheduleEffects', () => {
	it('should add every non-idle effect of `effects` to `scheduledEffects` ', () => {
		const subscribers: Effect[] = [
			{ fn: () => {}, cleanup: undefined, isIdle: true },

			{ fn: () => {}, cleanup: undefined, isIdle: true },

			{ fn: () => {}, cleanup: undefined, isIdle: false },
		];
		scheduleEffects(subscribers);

		expect(context.scheduledEffects.length).toBe(2);

		for (const subscriber of context.scheduledEffects) {
			expect(subscribers).toContain(subscriber);
		}
	});
	it('should not add the same effect to `context.scheduledEffects` if called multiple times', () => {
		const effects: Effect[] = [
			{
				fn: () => {},

				cleanup: undefined,

				isIdle: true,
			},

			{
				fn: () => {},

				cleanup: undefined,

				isIdle: true,
			},
		];

		scheduleEffects(effects);

		expect(context.scheduledEffects.length).toBe(effects.length);

		scheduleEffects(effects);

		expect(context.scheduledEffects.length).toBe(effects.length);

		expect(context.scheduledEffects.every((effect) => effects.includes(effect))).toBe(
			true,
		);
	});

	it('should not add the same effect from different arrays to `context.scheduledEffects`', () => {
		const effects1: Effect[] = [
			{
				fn: () => {},
				cleanup: undefined,
				isIdle: true,
			},
			{
				fn: () => {},
				cleanup: undefined,

				isIdle: true,
			},
		];
		const effects2: Effect[] = [...effects1];

		scheduleEffects(effects1);

		expect(context.scheduledEffects.length).toBe(effects1.length);

		scheduleEffects(effects2);

		expect(context.scheduledEffects.length).toBe(effects2.length);

		expect(
			context.scheduledEffects.every((subscriber) =>
				effects1.includes(subscriber),
			),
		).toBe(true);
	});
});

describe('prepareMemos', () => {
	it('should mark all root and nested memos Dirty', () => {
		const memo = mockMemo({
			memos: [mockMemo({ memos: [mockMemo()] }), mockMemo()],
		});

		prepareMemos(memo.memos);

		expect(memo.memos.every((memo) => memo.isDirty)).toBe(true);

		expect(memo.memos[0].memos[0].isDirty).toBe(true);
	});

	it('should schedule all effects of root and nested memos', () => {
		const deeplyNestedMemos: Memo<unknown>[] = [
			mockMemo({ effects: [{ fn: () => {}, cleanup: () => {}, isIdle: true }] }),
			mockMemo({ effects: [{ fn: () => {}, cleanup: () => {}, isIdle: true }] }),
		];

		const memos: Memo<unknown>[] = [
			mockMemo({
				effects: [
					{ fn: () => {}, cleanup: () => {}, isIdle: true },
					{ fn: () => {}, cleanup: () => {}, isIdle: true },
				],
				memos: deeplyNestedMemos,
			}),

			mockMemo({ effects: [{ fn: () => {}, cleanup: () => {}, isIdle: true }] }),
		];
		prepareMemos(memos);

		expect(
			memos.every((memo) =>
				memo.effects.every((effect) =>
					context.scheduledEffects.includes(effect),
				),
			),
		).toBe(true);

		expect(
			deeplyNestedMemos.every((memo) =>
				memo.effects.every((effect) =>
					context.scheduledEffects.includes(effect),
				),
			),
		).toBe(true);
	});
});

describe.todo('subscribeContextToState', () => {
	describe('effects', () => {
		it('should set `state.lastEffect` to `context.currentEffect` and add `context.currentEffect` to `state.effects`', () => {
			const state: State = {
				lastEffect: null,
				lastMemo: null,
				ownerScope: null,
				effects: [],
				memos: [],
			};

			context.currentEffect = { fn: () => {}, cleanup: undefined, isIdle: false };

			subscribeContextToState(state);

			expect(state.lastEffect).toBe(context.currentEffect);

			expect(state.effects.length).toBe(1);
			expect(state.effects[0]).toBe(context.currentEffect);
		});

		it('should not add the same `context.currentEffect` if called multiple times', () => {
			const state: State = {
				lastEffect: null,
				lastMemo: null,
				ownerScope: null,
				effects: [],
				memos: [],
			};

			context.currentEffect = { fn: () => {}, cleanup: undefined, isIdle: false };

			subscribeContextToState(state);
			subscribeContextToState(state);

			expect(state.effects.length).toBe(1);
			expect(state.effects[0]).toBe(context.currentEffect);
		});

		it('should add `state.effects`, `context.currentEffect` and `1` (SubsQuantity) in correct order to component subs if they do not contain `state.effects`', () => {
			const state: State = {
				lastEffect: null,
				lastMemo: null,
				ownerScope: null,
				effects: [],
				memos: [],
			};

			context.currentScope = { subs: [], cleanups: [] };
			context.currentEffect = { fn: () => {}, cleanup: undefined, isIdle: false };
			subscribeContextToState(state);

			const subs = context.currentScope.subs;

			expect(subs[ComponentSubsOffset.StateSubs]).toBe(context.currentEffect);
			expect(subs[ComponentSubsOffset.FirstSub]).toBe(context.currentEffect);
			expect(subs[ComponentSubsOffset.SubsQuantity]).toBe(context.currentEffect);
		});
	});

	describe('memos', () => {
		it('should set `state.lastMemo` to `context.currentMemo` and add `context.currentMemo` to `state.memos`', () => {
			const state: State = {
				lastEffect: null,
				lastMemo: null,
				ownerScope: null,
				effects: [],
				memos: [],
			};

			context.currentMemo = mockMemo();
			subscribeContextToState(state);

			expect(state.lastMemo).toBe(context.currentMemo);

			expect(state.memos.length).toBe(1);
			expect(state.memos[0]).toBe(context.currentMemo);
		});

		it('should not add the same `context.currentMemo` if called multiple times', () => {
			const state: State = {
				lastEffect: null,
				lastMemo: null,
				ownerScope: null,
				effects: [],
				memos: [],
			};
			context.currentMemo = mockMemo();

			subscribeContextToState(state);
			subscribeContextToState(state);

			expect(state.memos.length).toBe(1);
			expect(state.memos[0]).toBe(context.currentMemo);
		});
	});
});
