import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { createEffect, createComputation } from '../';

import { context } from '../context';
import type { Subscriber } from '../';

import { resetContext } from './testingUtils';

/**
 *
 * @param subscriberCreator
 *
 *
 *
 *
 */
const testSubscriberWithContext = (
    subscriberCreator: (subscriber: Subscriber) => unknown,
) => {
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

        const computer = () => {};

        subscriberCreator(computer);

        expect(currentSubscriberMock).toHaveBeenNthCalledWith(1, computer);

        expect(currentSubscriberMock).toHaveBeenNthCalledWith(2, null);
    });

    it('should run `computer` argument only once', () => {
        const computer = vi.fn();
        subscriberCreator(computer);

        expect(computer).toHaveBeenCalledTimes(1);
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
    testSubscriberWithContext(createEffect);
});

describe('createComputation', () => {
    testSubscriberWithContext(createComputation);

    it('should return an object with property `computer` from `computer` argument', () => {
        const computer = () => {};
        expect(createComputation(computer).computer).toBe(computer);
    });
});
