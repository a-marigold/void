import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { getValue, setValue, postSetValue, createEffect, createComputation, compute } from '../..';

import type { Signal } from '../..';

import { resetContext } from '../__testingUtils__';

beforeEach(resetContext);

describe('signal and effect', () => {
    it('should add subscriber of `createEffect` to `signal.subscribers` when the `getValue` called', () => {
        const count: Signal<number> = {
            subscribers: new Set(),

            value: 0,
        };

        const fn = () => {
            getValue(count);
        };

        createEffect(fn);

        expect(count.subscribers.size).toBe(1);
    });

    it('should batch updates', () => {
        const count: Signal<number> = {
            subscribers: new Set(),

            value: 16,
        };

        const fn = vi.fn(() => {
            getValue(count);

            setValue(count, count.value + 1);
        });

        createEffect(fn);

        setValue(count, 0);

        setValue(count, 1);

        setValue(count, 2);

        queueMicrotask(() => {
            expect(fn).toBeCalledTimes(2);
        });
    });

    it('should not call effect cleanup immediatly, but should call it before `fn` every dependency update', () => {
        const count: Signal<number> = {
            subscribers: new Set(),

            value: 0,
        };

        const cleanup = vi.fn();

        const fn = vi.fn(() => {
            getValue(count);
            return cleanup;
        });

        createEffect(fn);

        expect(cleanup).toBeCalledTimes(0);

        setValue(count, 16);

        queueMicrotask(() => {
            expect(fn).toBeCalledTimes(2);

            expect(cleanup).toBeCalledTimes(1);
        });
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

        const fn = vi.fn(() => {
            getValue(count);

            getValue(name);
        });

        createEffect(fn);

        setValue(count, 1);

        queueMicrotask(() => {
            expect(fn).toHaveBeenCalledTimes(2); // first from `createEffect`, second from `setValue`
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

        const fn = vi.fn(() => {
            compute(doubled);
        });

        createEffect(fn);

        setValue(count, 1);

        queueMicrotask(() => {
            expect(fn).toHaveBeenCalledTimes(2);
        });
    });

    it('should batch `computation.subscribers` when `setValue` called', () => {
        const count: Signal<number> = {
            subscribers: new Set(),
            value: 0,
        };

        const multiplied = createComputation(() => getValue(count) * 16);

        const subscriber = vi.fn(() => {
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
