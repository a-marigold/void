import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { createEffect } from '../effect';

import { context } from '../context';
import type { Effect } from '..';

import { resetContext } from './__testingUtils__';

beforeEach(resetContext);

describe('createEffect', () => {
    it('should call `fn` argument only once', () => {
        const fn = vi.fn();

        createEffect(fn);

        expect(fn).toHaveBeenCalledTimes(1);
    });
    it.serial(
        ' should clear `context.currentEffect` even if there is an uncaught error `subscriber`',

        () => {
            expect.assertions(2);

            const err = Symbol();
            try {
                createEffect(() => {
                    throw err;
                });
            } catch (error) {
                expect(context.currentEffect).toBe(null);
                expect(error).toBe(err);
            }
        },
    );

    it('should add returned function from `fn` argument to effect cleanup', () => {
        let lastObjectEffect: Effect | null = null;

        let currentEffect: Effect;
        Object.defineProperty(context, 'currentEffect', {
            get: () => currentEffect,

            set: (value) => {
                if (value) {
                    lastObjectEffect = value;
                }

                currentEffect = value;
            },
        });

        const cleanup = () => {};

        const fn = () => cleanup;

        createEffect(fn);
        expect((lastObjectEffect as Effect | null)?.fn).toBe(fn);

        expect((lastObjectEffect as Effect | null)?.cleanup).toBe(cleanup);
    });

    it('should add `undefined` to effect cleanup if `fn` returned undefined', () => {
        let lastObjectEffect: Effect | null = null;

        let currentSubscriber: Effect;

        Object.defineProperty(context, 'currentEffect', {
            get: () => currentSubscriber,
            set: (value) => {
                if (value) {
                    lastObjectEffect = value;
                }
                currentSubscriber = value;
            },
        });

        const fn = () => {};

        createEffect(fn);

        expect((lastObjectEffect as Effect | null)?.fn).toBe(fn);

        expect((lastObjectEffect as Effect | null)?.cleanup).toBe(undefined);
    });
});
