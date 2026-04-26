import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { getValue, setValue, createEffect, createMemo, computeMemo } from '../..';

import { resetContext, mockSignal } from '../__testingUtils__';

beforeEach(resetContext);

describe('Effect with Signal', () => {
    it('should subscribe effect to signal when the `getValue` is called inside', () => {
        const count = mockSignal({
            value: 0,
        });

        const fn = () => {
            getValue(count);
        };

        createEffect(fn);

        expect(count.effects.length).toBe(1);
    });
    it('should not add the same effect to `signal.effects` if signal accessed multiple times', () => {
        const count = mockSignal({ value: 0 });

        const fn = () => {
            getValue(count);
            getValue(count);
            getValue(count);
        };

        createEffect(fn);

        expect(count.effects.length).toBe(1);
    });

    it('should not call effect cleanup immediatly, but should call it before `fn` every dependency update', () => {
        const count = mockSignal({
            value: 0,
        });

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

    it('should run effects with 2 signals inside either one of signals is updated', () => {
        const count = mockSignal({
            value: 0,
        });

        const name = mockSignal({
            value: 'a',
        });

        const fn = vi.fn(() => {
            getValue(count);

            getValue(name);
        });

        createEffect(fn);

        setValue(count, 1);

        queueMicrotask(() => {
            expect(fn).toHaveBeenCalledTimes(2);
        });
    });
});

describe('Memo with Signal', () => {
    it('should not subscribe the same memo to signal if signal accessed multiple times', () => {
        const count = mockSignal({ value: 0 });

        createMemo(() => getValue(count) + getValue(count));

        expect(count.memos.length).toBe(1);
    });

    describe('memoization', () => {
        it('should recompute memo only if signal inside is updated', () => {
            const count = mockSignal({
                value: 16,
            });
            const doubled = createMemo(vi.fn(() => getValue(count) * 2));

            computeMemo(doubled);
            computeMemo(doubled);

            expect(doubled.fn).toHaveBeenCalledTimes(1);
            setValue(count, 1600);

            computeMemo(doubled);
            computeMemo(doubled);

            expect(doubled.fn).toHaveBeenCalledTimes(2);
        });
        it('should recompute memo only if memo inside is updated', () => {
            const count = mockSignal({
                value: 16,
            });
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

        describe('eager behaviour', () => {
            it('memo should be recomputed eagerly when nested signal updates', () => {
                const count = mockSignal({
                    value: 0,
                });
                const quantifier = mockSignal({
                    value: 1,
                });
                const quantified = createMemo(() => getValue(count) * getValue(quantifier));

                expect(computeMemo(quantified)).toBe(0);

                setValue(count, 16);

                expect(computeMemo(quantified)).toBe(16);

                setValue(quantifier, 2);

                expect(computeMemo(quantified)).toBe(32);
            });

            it('outer memo should be recomputed eagerly when nested memo updates', () => {
                const count = mockSignal({
                    value: 0,
                });

                const quantifier = mockSignal({
                    value: 1,
                });

                const quantified = createMemo(() => getValue(count) * getValue(quantifier));

                const quantifiedX2 = createMemo(() => computeMemo(quantified) * 2);

                expect(computeMemo(quantifiedX2)).toBe(0);

                setValue(count, 16);
                expect(computeMemo(quantifiedX2)).toBe(32);

                setValue(quantifier, 2);
                expect(computeMemo(quantifiedX2)).toBe(64);
            });
        });
    });
});

describe('Effect with Memo with Signal', () => {
    it('should update effect when outer memo with nested memo is updated', () => {
        const count = mockSignal({
            value: 0,
        });
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
        const count = mockSignal({
            value: 0,
        });
        const zeroVal = mockSignal({
            value: 0,
        });

        const doubled = createMemo(() => getValue(count) * 2);

        const tripled = createMemo(() => (computeMemo(doubled) / 2) * 3 + getValue(zeroVal));

        createEffect(() => {
            computeMemo(tripled);
        });

        expect(count.effects.length).toBe(0);
        expect(count.memos.length).toBe(1);

        expect(doubled.effects.length).toBe(0);
        expect(tripled.effects.length).toBe(1);
    });

    it('signal should not propagate updates if its value is not changed', () => {
        const value = 16;

        const count = mockSignal({
            value,
        });
        const memoFn = vi.fn(() => getValue(count) * 2);

        const doubled = createMemo(memoFn);

        expect(computeMemo(doubled)).toBe(32);

        const effectFn = vi.fn(() => {
            getValue(count);

            computeMemo(doubled);
        });

        createEffect(effectFn);

        setValue(count, value);

        queueMicrotask(() => {
            expect(memoFn).toHaveBeenCalledTimes(1);

            expect(effectFn).toHaveBeenCalledTimes(1);
        });
    });

    it('memo should not propagate updates if memo value is not changed', () => {
        const count = mockSignal({
            value: 16,
        });

        const sm = createMemo(() => (getValue(count) >= 16 ? true : false));

        expect(computeMemo(sm)).toBe(true);

        createEffect(() => {
            computeMemo(sm);
        });
    });

    describe('batching', () => {
        it('should batch effect updates with signals inside', () => {
            const name = mockSignal({ value: 'Void' });

            const greeting = mockSignal({ value: 'Hello' });

            const effect1Fn = vi.fn(() => {
                // user code simulation
                getValue(name) + ', ' + getValue(greeting);
            });

            createEffect(effect1Fn);

            const effect2Fn = vi.fn(() => {
                getValue(name);
            });
            createEffect(effect2Fn);

            setValue(name, 'v');
            setValue(name, 'vo');

            setValue(name, 'voi');
            setValue(name, 'void');

            queueMicrotask(() => {
                expect(effect1Fn).toHaveBeenCalledTimes(2);
                expect(effect2Fn).toHaveBeenCalledTimes(2);
            });
        });

        it('should batch effect updates with memos inside', () => {
            const name = mockSignal({ value: 'Void' });
            const greeting = mockSignal({ value: 'Hello' });

            const fullGreeting = createMemo(() => getValue(name) + ', ' + getValue(greeting));

            const effectFn = vi.fn(() => {
                computeMemo(fullGreeting);
            });
            createEffect(effectFn);

            setValue(name, 'v');
            setValue(name, 'vo');

            setValue(name, 'voi');
            setValue(name, 'void');

            queueMicrotask(() => {
                expect(effectFn).toHaveBeenCalledTimes(2);
            });
        });
    });
});

describe('Reactivity error recovery', () => {
    /**
     *
     * Tests standard interaction with reactivity to be sure that reactivity is recovered successfully.
     *
     *
     *
     *
     *
     *
     *
     *
     */

    const testRecoveredReactivity = (): void => {
        const count = mockSignal({ value: 0 });

        const doubled = createMemo(() => getValue(count) * 2);

        expect(computeMemo(doubled)).toBe(0);

        setValue(count, 16);

        expect(computeMemo(doubled)).toBe(32);

        const effectFn = vi.fn(() => {
            computeMemo(doubled);
        });

        createEffect(effectFn);

        expect(effectFn).toHaveBeenCalledTimes(1);

        setValue(count, 32);

        setValue(count, 64);

        setValue(count, 128);

        queueMicrotask(() => {
            expect(effectFn).toHaveBeenCalledTimes(2);
        });
    };

    it('should recover after creating effect or memo with errors inside', () => {
        const err = new Error();

        expect(() => {
            createEffect(() => {
                throw err;
            });
        }).toThrow(err);

        testRecoveredReactivity();

        expect(() => {
            createMemo(() => {
                throw err;
            });
        }).toThrow(err);

        testRecoveredReactivity();
    });

    it('should recover after computing already subscribed memo with errors', () => {
        const err = new Error();

        const count = mockSignal({ value: 0 });

        const doubled = createMemo(() => {
            // simulate conditional user error

            if (getValue(count)) {
                throw err;
            }
        });

        setValue(count, 16);

        expect(() => {
            computeMemo(doubled);
        }).toThrow(err);

        testRecoveredReactivity();
    });
});
