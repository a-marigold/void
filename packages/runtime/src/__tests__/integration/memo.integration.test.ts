import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { resetContext } from '../__testingUtils__';

import { getValue, setValue, createEffect, createMemo, computeMemo } from '../../';

import type { Signal } from '../../';

beforeEach(resetContext);

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
