import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { computeMemo, createMemo } from '../memo';

import type { Effect } from '../types';

import { context } from '../context';

import { resetContext, mockMemo } from './__testingUtils__';
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
    it('should add `context.currentMemo` to `memo.subscribers` if it is not `null`', () => {
        context.currentEffect = {
            fn: () => {},
            cleanup: undefined,
            isIdle: true,
        };

        const effectsDirty: Effect[] = [];

        computeMemo(
            mockMemo({
                effects: effectsDirty,
                fn: () => {},

                isDirty: true,
                prevValue: undefined,
            }),
        );

        expect(effectsDirty.length).toBe(1);
        expect(effectsDirty).toContain(context.currentEffect);

        context.currentEffect = {
            fn: () => {},
            cleanup: undefined,

            isIdle: true,
        };
        const effectsNot: Effect[] = [];

        computeMemo(
            mockMemo({
                effects: effectsNot,
                fn: () => {},
                isDirty: false,
                prevValue: undefined,
            }),
        );

        expect(effectsNot.length).toBe(1);
        expect(effectsNot).toContain(context.currentEffect);
    });

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
});
