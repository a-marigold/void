import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { createEffect } from '..';

import { context } from '../context';
import type { Subscriber } from '..';

import { resetContext } from './__testingUtils__';

/**
 *
 * A test suit for functions that work with subscribers (`createEffect`).
 *
 *
 *
 * @param subscriberCreator Function to  be  tested (for example, `createEffect`).
 *
 *
 *
 *
 */

const testSubscriberCreator = (subscriberCreator: (fn: Subscriber['fn']) => unknown) => {
    it('should run `subscriber` argument only once', () => {
        const fn = vi.fn();

        subscriberCreator(fn);

        expect(fn).toHaveBeenCalledTimes(1);
    });

    it.serial(
        'should clear `context.currentSubscriber` even if there is an uncaught error `subscriber`',

        () => {
            expect.assertions(1);

            try {
                subscriberCreator(() => {
                    throw '';
                });
            } catch (error) {
                expect(context.currentSubscriber).toBe(null);
            }
        },
    );
};

beforeEach(resetContext);

describe('createEffect', () => {
    it('should add returned function from `fn` argument to `subscriber` cleanup', () => {
        const currentSubscriberMock = vi.fn();

        let currentSubscriber: Subscriber;
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

        expect((currentSubscriberMock.mock.calls[0][0] as Subscriber).fn).toBe(fn);

        expect((currentSubscriberMock.mock.calls[0][0] as Subscriber).cleanup).toBe(cleanup);
    });

    it('should add `undefined` to `subscriber` cleanup if `fn` returned undefined', () => {
        const currentSubscriberMock = vi.fn();

        let currentSubscriber: Subscriber;

        Object.defineProperty(context, 'currentSubscriber', {
            get: () => currentSubscriber,
            set: (value) => {
                currentSubscriberMock(value);

                currentSubscriber = value;
            },
        });

        const fn = () => {};

        createEffect(fn);

        expect((currentSubscriberMock.mock.calls[0][0] as Subscriber).fn).toBe(fn);

        expect((currentSubscriberMock.mock.calls[0][0] as Subscriber).cleanup).toBe(undefined);
    });

    testSubscriberCreator(createEffect);
});
