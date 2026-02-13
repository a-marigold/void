import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { createEffect } from '../effect';

import { context } from '../context';

import { resetContext } from './testingUtils';

beforeEach(resetContext);

describe('createEffect', () => {
    it('should mutate `context.currentSubscriber` correctly', () => {
        const currentSubscriberSpy = vi.fn();

        let currentSubscriberValue = context.currentSubscriber;
        Object.defineProperty(context, 'currentSubscriber', {
            get: () => currentSubscriberValue,

            set: (value) => {
                currentSubscriberSpy(value);

                currentSubscriberValue = value;
            },
        });

        const subscriber = () => {
            let a = '';

            a = '10';
        };

        createEffect(subscriber);

        expect(currentSubscriberSpy).toHaveBeenNthCalledWith(1, subscriber);

        expect(currentSubscriberSpy).toHaveBeenNthCalledWith(2, null);

        expect(context.currentSubscriber).toBe(null);
    });

    it('should run the `subscriber` argument only once', () => {
        const subscriberSpy = vi.fn();

        createEffect(subscriberSpy);

        expect(subscriberSpy).toBeCalledTimes(1);
    });

    it.serial(
        'should clear `context.currentSubscriber` even if there is an uncaught error `subscriber`',

        () => {
            const errorText = 'error';

            expect.assertions(2);
            try {
                createEffect(() => {
                    throw errorText;
                });
            } catch (error) {
                expect(error).toBe(errorText);
                expect(context.currentSubscriber).toBe(null);
            }
        },
    );
});
