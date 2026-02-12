import { describe, it, expect, afterEach, vi } from 'bun:test';

import { createEffect } from '../effect';

import { context } from '../context';

import { resetContext } from './testingUtils';

afterEach(() => {
    resetContext();

    vi.clearAllMocks();
});

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
});
