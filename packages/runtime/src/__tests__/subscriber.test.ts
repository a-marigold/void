import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { createEffect, createComputation, compute } from '..';

import { context } from '../context';
import type { Subscriber, Computation } from '..';

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

describe('createComputation', () => {
    it('should return an object with property `computer` from `computer` argument', () => {
        const computer = () => {};

        expect(createComputation(computer).computer).toBe(computer);
    });

    describe('compute', () => {
        it('should return a `computation.computer` call', () => {
            const result = { a: 'b' };

            expect(compute({ subscribers: new Set(), computer: () => result })).toBe(result);
        });

        it('should add `context.currentSubscriber` to `computation.subscribers` if it is not undefined', () => {
            const computation: Computation<number> = {
                subscribers: new Set(),

                computer: () => 16,
            };

            context.currentSubscriber = { fn: () => {}, cleanup: () => {} };

            compute(computation);

            expect(computation.subscribers.size).toBe(1);

            expect(computation.subscribers.has(context.currentSubscriber)).toBe(true);
        });
    });

    testSubscriberCreator(createComputation);
});
