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
        'should clear `context.currentSubscriber` even if there is an uncaught error `subscriber`',

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

    it('should add returned function from `fn` argument to `subscriber` cleanup', () => {
        const currentSubscriberMock = vi.fn();

        let currentSubscriber: Effect;
        Object.defineProperty(context, 'currentSubscriber', {
            get: () => currentSubscriber,

            set: (value) => {
                currentSubscriberMock(value);

                currentSubscriber = value;
            },
        });

        const cleanup = () => {};

        const fn = () => cleanup;

        createEffect(fn);
        expect((currentSubscriberMock.mock.calls[0][0] as Effect).fn).toBe(fn);

        expect((currentSubscriberMock.mock.calls[0][0] as Effect).cleanup).toBe(cleanup);
    });

    it('should add `undefined` to `subscriber` cleanup if `fn` returned undefined', () => {
        const currentSubscriberMock = vi.fn();

        let currentSubscriber: Effect;

        Object.defineProperty(context, 'currentSubscriber', {
            get: () => currentSubscriber,
            set: (value) => {
                currentSubscriberMock(value);

                currentSubscriber = value;
            },
        });

        const fn = () => {};

        createEffect(fn);

        expect((currentSubscriberMock.mock.calls[0][0] as Effect).fn).toBe(fn);

        expect((currentSubscriberMock.mock.calls[0][0] as Effect).cleanup).toBe(undefined);
    });
});
