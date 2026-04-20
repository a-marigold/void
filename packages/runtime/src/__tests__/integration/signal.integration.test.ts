import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { getValue, setValue, createEffect, createMemo, computeMemo } from '../..';

import type { Signal } from '../..';

import { resetContext } from '../__testingUtils__';

beforeEach(resetContext);

describe('Effect integration with signal', () => {
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

        let lastRunFunc: 'fn' | 'cleanup' | '' = '';

        const cleanup = vi.fn(() => {
            lastRunFunc = 'cleanup';
        });

        const fn = vi.fn(() => {
            getValue(count);

            lastRunFunc = 'fn';

            return cleanup;
        });

        createEffect(fn);

        expect(cleanup).toBeCalledTimes(0);

        setValue(count, 16);

        queueMicrotask(() => {
            expect(lastRunFunc).toBe('fn');

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
describe('Effect integration with memo and signal', () => {
    it('should update effect when memo with nested memo is updated', () => {
        const count: Signal<number> = { subscribers: new Set(), value: 0 };
        const doubled = createMemo(() => getValue(count) * 2);

        const quadrupled = createMemo(() => computeMemo(doubled) * 4);

        const fn = vi.fn(() => {
            computeMemo(quadrupled);
        });

        createEffect(fn);

        setValue(count, 16);

        queueMicrotask(() => {
            expect(fn).toBeCalledTimes(2);
        });
    });

    it('computeMemo should not subscribe outer effect or memo on nested memos and signals', () => {
        const count: Signal<number> = { subscribers: new Set(), value: 0 };

        const doubled = createMemo(() => getValue(count) * 2);
        const tripled = createMemo(() => (computeMemo(doubled) / 2) * 3);

        createEffect(() => {
            computeMemo(doubled);

            computeMemo(tripled);
        });

        expect(count.subscribers.size).toBe(1);
    });

    describe('memoization', () => {
        it('should recompute memo only if signal inside is really updated', () => {
            const count: Signal<number> = { subscribers: new Set(), value: 16 };

            const doubled = createMemo(vi.fn(() => getValue(count) * 2));

            computeMemo(doubled);

            computeMemo(doubled);

            expect(doubled.fn).toHaveBeenCalledTimes(1);

            setValue(count, 1600);

            computeMemo(doubled);

            computeMemo(doubled);

            expect(doubled.fn).toHaveBeenCalledTimes(2);
        });

        it('should recompute memo only if memo inside is really updated', () => {
            const count: Signal<number> = { subscribers: new Set(), value: 16 };

            const doubled = createMemo(() => getValue(count) * 2);

            const tripled = createMemo(vi.fn(() => (computeMemo(doubled) / 2) * 3));

            computeMemo(tripled);
            computeMemo(tripled);

            expect(tripled.fn).toHaveBeenCalledTimes(1);
            setValue(count, 1600);

            computeMemo(tripled);

            computeMemo(tripled);

            expect(tripled.fn).toHaveBeenCalledTimes(2);
        });
    });
});

describe.todo('Reactivity error recovery', () => {});
