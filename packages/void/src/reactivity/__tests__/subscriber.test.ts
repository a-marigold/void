import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { createEffect, createComputation, compute } from '../';

import { context } from '../context';
import type { Subscriber, Computation } from '../';

import { resetContext } from './__testingUtils__';

/**
 *
 * A test suit for functions that work with subscribers (`createEffect`, `createComputation`).
 *
 *
 *
 * @param subscriberCreator Function to be tested (for example, `createEffect`).
 *
 *
 *
 *
 */

const testSubscriberWithContext = (
    subscriberCreator: (subscriber: Subscriber) => unknown,
) => {
    it('should run `subscriber` argument only once', () => {
        const subscriber = vi.fn();

        subscriberCreator(subscriber);

        expect(subscriber).toHaveBeenCalledTimes(1);
    });
    it.serial(
        'should clear `context.currentSubscriber` even if there is an uncaught error `subscriber`',

        () => {
            const errorText = 'error';

            expect.assertions(2);

            try {
                subscriberCreator(() => {
                    throw errorText;
                });
            } catch (error) {
                expect(error).toBe(errorText);

                expect(context.currentSubscriber).toBe(null);
            }
        },
    );
};

beforeEach(resetContext);

describe('createEffect', () => {
    it('should mutate `context.currentSubscriber` correctly', () => {
        const currentSubscriberMock = vi.fn();
        let currentSubscriber = context.currentSubscriber;

        Object.defineProperty(context, 'currentSubscriber', {
            get: () => currentSubscriber,

            set: (value) => {
                currentSubscriberMock(value);

                currentSubscriber = value;
            },
        });

        const subscriber = () => {};

        createEffect(subscriber);

        expect(currentSubscriberMock).toHaveBeenNthCalledWith(1, subscriber);

        expect(currentSubscriberMock).toHaveBeenNthCalledWith(2, null);
    });

    testSubscriberWithContext(createEffect);
});

describe('createComputation', () => {
    testSubscriberWithContext(createComputation);

    it('should return an object with property `computer` from `computer` argument', () => {
        const computer = () => {};

        expect(createComputation(computer).computer).toBe(computer);
    });

    describe('compute', () => {
        it('should return a `computation.computer` call', () => {
            const result = { a: 'b' };

            expect(
                compute({ subscribers: new Set(), computer: () => result }),
            ).toBe(result);
        });

        it('should add `context.currentSubscriber` to `computation.subscribers` if it is not undefined', () => {
            const computation: Computation<number> = {
                subscribers: new Set(),

                computer: () => 16,
            };

            const subscriber = () => {};

            context.currentSubscriber = subscriber;

            compute(computation);

            expect(computation.subscribers.size).toBe(1);

            expect(computation.subscribers.has(subscriber)).toBe(true);
        });
    });
});
