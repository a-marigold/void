import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { createComputation } from '../computation';

import { context } from '../context';

import { resetContext } from './testingUtils';

beforeEach(resetContext);

describe('createComputation', () => {
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

        createComputation(computer);

        expect(currentSubscriberMock).toHaveBeenNthCalledWith(1, computer);
        expect(currentSubscriberMock).toHaveBeenNthCalledWith(2, null);
    });
    it('should run `computer` argument only once', () => {
        const computer = vi.fn();
        createComputation(computer);

        expect(computer).toHaveBeenCalledTimes(1);
    });
});
