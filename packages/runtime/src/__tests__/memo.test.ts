import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { computeMemo, createMemo } from '../memo';

import type { Memo } from '../types';

import { context } from '../context';

import { resetContext } from './__testingUtils__';
beforeEach(resetContext);

describe('createMemo', () => {
    it('should call `fn` argument only once', () => {
        const fn = vi.fn();

        createMemo(fn);

        expect(fn).toHaveBeenCalledTimes(1);
    });

    it.serial(
        'should clear `context.currentSubscriber` even if there is an uncaught error `subscriber` and pass the error farther',
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

    it('should return Memo with `isDirty` set to `false`, `prevValue` set to result of `fn` and `isChanged` set to `true`', () => {
        const result = Symbol();

        const fn = () => result;

        const memo = createMemo(fn);

        expect(memo.fn).toBe(fn);

        expect(memo.isDirty).toBe(false);

        expect(memo.prevValue).toBe(result);

        expect(memo.isChanged).toBe(true);
    });
});

describe('computeMemo', () => {
    it('should add `context.currentSubscriber` to `memo.subscribers` if it is not `null`', () => {
        context.currentEffect = {
            fn: () => {},
            cleanup: undefined,
            isIdle: true,
            isEager: false,
        };

        const subscribersDirty: Memo<unknown>['effects'] = new Set();

        computeMemo({
            effects: subscribersDirty,
            fn: () => {},
            isDirty: true,
            prevValue: undefined,
            isChanged: true,
        });

        expect(subscribersDirty.size).toBe(1);
        expect(subscribersDirty.has(context.currentEffect)).toBe(true);

        context.currentEffect = {
            fn: () => {},
            cleanup: undefined,
            isIdle: true,
            isEager: false,
        };

        const subscribersNotDirty: Memo<unknown>['effects'] = new Set();

        computeMemo({
            effects: subscribersNotDirty,
            fn: () => {},
            isDirty: false,
            prevValue: undefined,
            isChanged: true,
        });

        expect(subscribersNotDirty.size).toBe(1);
        expect(subscribersNotDirty.has(context.currentEffect)).toBe(true);
    });

    it('should return `prevValue` of memo and NOT call `fn` if `isDirty` is `false`', () => {
        const fn = vi.fn();

        const prevValue = Symbol();

        expect(
            computeMemo({ effects: new Set(), fn, isDirty: false, prevValue, isChanged: true }),
        ).toBe(prevValue);

        expect(fn).not.toBeCalled();
    });

    it('should return new value, update `isDirty` and `prevValue` when `isDirty` is `true`', () => {
        const prevValue = Symbol();

        const newValue = Symbol();
        const memo: Memo<unknown> = {
            effects: new Set(),

            fn: vi.fn(() => newValue),

            isDirty: true,
            prevValue,
            isChanged: true,
        };

        expect(computeMemo(memo)).toBe(newValue);
        expect(memo.isDirty).toBe(false);

        expect(memo.prevValue).toBe(newValue);
    });
});
