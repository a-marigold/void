import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { computeMemo, createMemo } from '../memo';

import type { Memo } from '../types';

import { context } from '../context';

import { resetContext, mockMemo } from './__testingUtils__';
import { testStateGetter } from './___sharedTestSuits__';
beforeEach(resetContext);

describe('createMemo', () => {
    it('should call `fn` argument only once', () => {
        const fn = vi.fn();
        createMemo(fn);

        expect(fn).toHaveBeenCalledTimes(1);
    });

    it.serial(
        'should clear `context.currentMemo` even if there is an uncaught error `subscriber` and pass the error farther',
        () => {
            expect.assertions(2);

            const err = Symbol();

            try {
                createMemo(() => {
                    throw err;
                });
            } catch (error) {
                expect(context.currentEffect).toBe(null);

                expect(error).toBe(err);
            }
        },
    );

    it('should return Memo with `isDirty` set to `false`, `prevValue` set to result of `fn`', () => {
        const result = Symbol();

        const fn = () => result;

        const memo = createMemo(fn);

        expect(memo.fn).toBe(fn);

        expect(memo.isDirty).toBe(false);

        expect(memo.prevValue).toBe(result);
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
