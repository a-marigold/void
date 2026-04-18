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
        ' should clear `context.currentSubscriber` even if there is an uncaught error `subscriber` and pass the error farther',

        () => {
            expect.assertions(2);

            const err = Symbol();

            try {
                createMemo(() => {
                    throw err;
                });
            } catch (error) {
                expect(context.currentSubscriber).toBe(null);

                expect(error).toBe(err);
            }
        },
    );

    it('should return Memo with `isDirty` set to `false` and `prevValue` set to result of `fn`', () => {
        const value = Symbol();

        const fn = () => value;

        const memo = createMemo(fn);

        expect(memo.fn).toBe(fn);

        expect(memo.isDirty).toBe(false);

        expect(memo.prevValue).toBe(value);
    });
});

describe('computeMemo', () => {
    it('should add `context.currentSubscriber` to `memo.subscribers` if it is not `null`', () => {
        context.currentSubscriber = { fn: () => {}, cleanup: undefined };

        const subscribersDirty: Memo<unknown>['subscribers'] = new Set();

        computeMemo({
            subscribers: subscribersDirty,
            fn: () => {},
            isDirty: true,
            prevValue: undefined,
        });

        expect(subscribersDirty.size).toBe(1);
        expect(subscribersDirty.has(context.currentSubscriber)).toBe(true);

        context.currentSubscriber = { fn: () => {}, cleanup: undefined };

        const subscribersNotDirty: Memo<unknown>['subscribers'] = new Set();

        computeMemo({
            subscribers: subscribersNotDirty,
            fn: () => {},
            isDirty: false,
            prevValue: undefined,
        });

        expect(subscribersNotDirty.size).toBe(1);
        expect(subscribersNotDirty.has(context.currentSubscriber)).toBe(true);
    });

    it('should return `prevValue` of memo and NOT call `fn` if `isDirty` is `false`', () => {
        const fn = vi.fn();

        const prevValue = Symbol();

        expect(computeMemo({ subscribers: new Set(), fn, isDirty: false, prevValue })).toBe(
            prevValue,
        );

        expect(fn).not.toBeCalled();
    });

    it('should return newValue, update `isDirty` and `prevValue` when `isDirty` is `true`', () => {
        const prevValue = Symbol();

        const newValue = Symbol();

        const memo: Memo<unknown> = {
            subscribers: new Set(),

            fn: vi.fn(() => newValue),

            isDirty: true,
            prevValue,
        };

        expect(computeMemo(memo)).toBe(newValue);
        expect(memo.isDirty).toBe(false);

        expect(memo.prevValue).toBe(newValue);
    });
});
