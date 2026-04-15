import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { getValue, setValue, postSetValue } from '../signal';

import { context } from '../context';
import type { Signal, SetValue } from '../types';

import { resetContext } from './__testingUtils__';

/**
 *
 *
 *
 *
 *
 * @param setFunction `setValue` or `postSetValue`.
 *
 */

const testSetValue = (setFunction: SetValue): void => {
    it('should batch subscribers only once when setter called multiple times', () => {
        const queueMicrotaskSpy = vi.spyOn(globalThis, 'queueMicrotask');

        const count: Signal<number> = {
            subscribers: new Set([
                { fn: () => {}, cleanup: undefined },
                { fn: () => {}, cleanup: undefined },
                { fn: () => {}, cleanup: undefined },
            ]),
            value: 0,
        };
        setFunction(count, 1);
        setFunction(count, 1);
        setFunction(count, 1);

        expect(context.scheduledSubscribers.size).toBe(count.subscribers.size);
        expect(context.scheduledDependencies.has(count.subscribers)).toBe(true);
        expect(queueMicrotaskSpy).toHaveBeenCalledTimes(1);
    });
};

beforeEach(resetContext);

describe('signal', () => {
    describe('getValue', () => {
        it('should always return the current value of a signal', () => {
            const count: Signal<number> = {
                subscribers: new Set(),

                value: 0,
            };

            expect(getValue(count)).toBe(0);

            count.value = 1;

            expect(getValue(count)).toBe(1);
        });

        it('should add `context.currentSubscriber` to `signal.subscribers`', () => {
            const name: Signal<string> = {
                subscribers: new Set(),

                value: 'abc',
            };

            context.currentSubscriber = { fn: () => {}, cleanup: undefined };

            getValue(name);

            expect(name.subscribers.size).toBe(1);

            expect(name.subscribers.has(context.currentSubscriber)).toBe(true);
        });

        it('should not change `signal.subscribers` if `context.currentSubscriber` is undefined', () => {
            const count: Signal<number> = {
                subscribers: new Set(),

                value: 0,
            };

            const prevSize = count.subscribers.size;

            context.currentSubscriber = null;

            getValue(count);
            expect(count.subscribers.size).toBe(prevSize);
        });
    });

    describe('setValue', () => {
        it('should return the same `value` argument', () => {
            const user: Signal = {
                subscribers: new Set(),

                value: { name: 'a' },
            };

            const prevUser = user.value;
            expect(setValue(user, user.value)).toBe(prevUser);

            const newUser = { name: 'a' };

            expect(setValue(user, newUser)).toBe(newUser);
        });
        testSetValue(setValue);
    });

    describe('postSetValue', () => {
        it('should return the previous `signal.value`', () => {
            const user: Signal = {
                subscribers: new Set(),

                value: { name: 'a' },
            };

            const prevValue = user.value;

            expect(postSetValue(user, { name: 'a' })).toBe(prevValue);
        });

        testSetValue(postSetValue);
    });
});
