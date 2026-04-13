import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { getValue, setValue, postSetValue, createEffect, createComputation, compute } from '../..';

import type { Signal, SetValue } from '../..';

import { resetContext } from '../__testingUtils__';

beforeEach(resetContext);
describe('createEffect and Signal', () => {
    it('should add subscriber of `createEffect` to `signal.subscribers` when the `getValue` called', () => {
        const count: Signal<number> = {
            subscribers: new Set(),

            value: 0,
        };

        const subscriber = () => {
            getValue(count);
        };

        createEffect(subscriber);

        expect(count.subscribers.size).toBe(1);
        expect(count.subscribers.has(subscriber)).toBe(true);
    });

    it('should run effects with 2 signals inside either one of signals updated', () => {
        const count: Signal<number> = {
            subscribers: new Set(),

            value: 0,
        };

        const name: Signal<string> = {
            subscribers: new Set(),
            value: 'a',
        };

        const subscriber = vi.fn().mockImplementation(() => {
            getValue(count);

            getValue(name);
        });

        createEffect(subscriber);

        setValue(count, 1);

        queueMicrotask(() => {
            expect(subscriber).toHaveBeenCalledTimes(2); // first from `createEffect`, second from `setValue`
        });
    });
});

describe('Signal, createEffect and createComputation', () => {
    it('should run all `computation.subscribers` after `setValue` with signal', () => {
        const count: Signal<number> = {
            subscribers: new Set(),

            value: 0,
        };

        const doubled = createComputation(() => getValue(count) * 2);

        const subscriber = vi.fn().mockImplementation(() => {
            compute(doubled);
        });

        createEffect(subscriber);

        setValue(count, 1);

        queueMicrotask(() => {
            expect(subscriber).toHaveBeenCalledTimes(2);
        });
    });

    it('should batch `computation.subscribers` when `setValue` called', () => {
        const count: Signal<number> = {
            subscribers: new Set(),
            value: 0,
        };

        const multiplied = createComputation(() => getValue(count) * 16);

        const subscriber = vi.fn().mockImplementation(() => {
            compute(multiplied);
        });

        createEffect(subscriber);

        // pretend user event with many signal updates
        for (let i = 0; i <= 16; i++) {
            setValue(count, i);
            postSetValue(count, i + 1);
        }

        queueMicrotask(() => {
            expect(subscriber).toHaveBeenCalledTimes(2);
        });
    });
});

const testSetSignalWithFlush = (setFunction: SetValue) => {
    it('should run `flush` after `setValue`', () => {
        const count: Signal<number> = {
            subscribers: new Set([vi.fn(), vi.fn(), vi.fn()]),
            value: 0,
        };

        setFunction(count, 1);

        // append new task to microtask queue to see was there a call of `flush` (`setValue` schedules `flush` via queueMicrotask)

        queueMicrotask(() => {
            for (const subscriber of count.subscribers) {
                expect(subscriber).toBeCalledTimes(1);
            }
        });
    });
};

describe('Signal and flush', () => {
    testSetSignalWithFlush(setValue);
    testSetSignalWithFlush(postSetValue);
});
