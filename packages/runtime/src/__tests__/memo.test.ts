import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { context } from '../context';
import { computeMemo, createMemo } from '../memo';
import type { Memo } from '../types';

import { testStateGetter } from './___sharedTestSuits__';
import { resetContext, mockMemo } from './__testingUtils__';

beforeEach(resetContext);

describe('createMemo', () => {
	it('should return Memo with `isDirty` set to `false`, `prevValue` set to result of `fn` and `ownerComponent` set to `context.currentComponent`', () => {
		const result = Symbol();

		const fn = () => result;

		context.currentScope = { subs: [], cleanups: [] };
		const memo = createMemo(fn);

		expect(memo.fn).toBe(fn);

		expect(memo.isDirty).toBe(false);
		expect(memo.prevValue).toBe(result);

		expect(memo.ownerScope).toBe(context.currentScope);
	});

	it('should call `fn` argument only once', () => {
		const fn = vi.fn();
		createMemo(fn);

		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('should clear `context.currentMemo` even if there is an uncaught error `subscriber` and pass the error farther', () => {
		const err = new Error();

		expect(() =>
			createMemo(() => {
				throw err;
			}),
		).toThrow(err);

		expect(context.currentMemo).toBe(null);
	});
});
describe('computeMemo', () => {
	it('should return `prevValue` of memo and NOT call `fn` if `isDirty` is `false`', () => {
		const fn = vi.fn();

		const prevValue = Symbol();

		expect(
			computeMemo(
				mockMemo({
					fn,
					isDirty: false,
					prevValue,
				}),
			),
		).toBe(prevValue);

		expect(fn).not.toBeCalled();
	});
	it('should return new value, update `isDirty` and `prevValue` when `isDirty` is `true`', () => {
		const prevValue = Symbol();
		const newValue = Symbol();

		const memo = mockMemo({
			fn: vi.fn(() => newValue),
			prevValue,
			isDirty: true,
		});

		expect(computeMemo(memo)).toBe(newValue);

		expect(memo.isDirty).toBe(false);

		expect(memo.prevValue).toBe(newValue);
	});

	testStateGetter<Memo<unknown>>(computeMemo, mockMemo);
});
