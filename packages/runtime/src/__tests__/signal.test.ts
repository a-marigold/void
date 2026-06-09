import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { context } from '../context';
import { getValue, setValue, postSetValue, createSignal } from '../signal';
import type { SetValue, Signal } from '../types';

import { testStateGetter } from './___sharedTestSuits__';
import { resetContext, mockSignal, mockMemo } from './__testingUtils__';

/**
 * @param setter `setValue` or `postSetValue`.
 */

const testSignalSetter = (setter: SetValue): void => {
	it('should flush effects only once even if setter called multiple times', () => {
		const queueMicrotaskSpy = vi.spyOn(globalThis, 'queueMicrotask');
		const count = mockSignal({
			effects: [
				{ fn: () => {}, cleanup: () => {}, isIdle: true },
				{ fn: () => {}, cleanup: undefined, isIdle: true },
			],
			memos: [],

			value: 0,
		});

		setter(count, 1);
		setter(count, 2);
		setter(count, 3);

		expect(queueMicrotaskSpy).toBeCalledTimes(1);
	});

	it('should not flush effects if `value` is the same', () => {
		const value = Symbol();

		const queueMicrotaskSpy = vi.spyOn(globalThis, 'queueMicrotask');

		const sym = mockSignal({
			effects: [
				{ fn: () => {}, cleanup: () => {}, isIdle: true },

				{ fn: () => {}, cleanup: undefined, isIdle: true },
			],

			value,
		});

		setter(sym, value);
		setter(sym, value);
		setter(sym, value);

		expect(queueMicrotaskSpy).toHaveBeenCalledTimes(0);
	});

	it('should mark all memos of signal and nested memos dirty', () => {
		const deeplyNestedMemos: Signal<unknown>['memos'] = [mockMemo(), mockMemo()];

		const count = mockSignal({
			memos: [mockMemo({ memos: deeplyNestedMemos }), mockMemo()],
		});

		setValue(count, {});

		expect(count.memos.every((memo) => memo.isDirty)).toBe(true);

		expect(deeplyNestedMemos.every((memo) => memo.isDirty)).toBe(true);
	});
};

beforeEach(resetContext);

describe('createSignal', () => {
	it('should return Signal with `value` set to `initValue` argument and `ownerComponent` set to `context.currentComponent`', () => {
		const initValue = Symbol();

		context.currentComponent = { subs: [], cleanups: [] };
		const signal = createSignal(initValue);

		expect(signal.value).toBe(initValue);
		expect(signal.ownerComponent).toBe(context.currentComponent);
	});
});

describe('getValue', () => {
	it('should always return the current value of a signal', () => {
		const value = Symbol();

		const sym = mockSignal({
			value,
		});

		expect(getValue(sym)).toBe(value);
	});

	testStateGetter<Signal<unknown>>(getValue, mockSignal);
});

describe('setValue', () => {
	it('should return the same `value`', () => {
		const sym = mockSignal({
			value: Symbol(),
		});

		const prev = sym.value;

		expect(setValue(sym, prev)).toBe(prev);

		const newValue = Symbol();

		expect(setValue(sym, newValue)).toBe(newValue);
	});

	testSignalSetter(setValue);
});
describe('postSetValue', () => {
	it('should return the previous `signal.value`', () => {
		const sym = mockSignal({
			value: Symbol(),
		});

		const prevValue = sym.value;

		expect(postSetValue(sym, Symbol())).toBe(prevValue);
	});

	testSignalSetter(postSetValue);
});
