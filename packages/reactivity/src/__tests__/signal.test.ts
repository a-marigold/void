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
    it('should call `queueMicrotask` if `context.isScheduled` is false', () => {
        const queueMicrotaskSpy = vi.spyOn(globalThis, 'queueMicrotask');

        const count: Signal<number> = {
            subscribers: new Set([() => {}, () => {}, () => {}]),
            value: 0,
        };

        setFunction(count, 1);

        expect(queueMicrotaskSpy).toHaveBeenCalledTimes(1);
    });

    it('should not call `queueMicrotask` if `context.isScheduled` is true', () => {
        const queueMicrotaskSpy = vi.spyOn(globalThis, 'queueMicrotask');

        const count: Signal<number> = {
            subscribers: new Set([() => {}]),

            value: 0,
        };

        const iterations = 16;
        for (let i = 0; i <= iterations; i++) {
            setFunction(count, i);
        }

        expect(queueMicrotaskSpy).toHaveBeenCalledTimes(1);

        expect(count.value).toBe(iterations);

        expect(context.scheduledSubscribers.size).toBe(count.subscribers.size);

        for (const subscriber of count.subscribers) {
            expect(context.scheduledSubscribers.has(subscriber)).toBe(true);
        }
    });
};

beforeEach(resetContext);

describe('Signal', () => {
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

        it('should add `context.currentSubscriber` to `signal.subscribers` if `context.currentSubscriber` is not undefined', () => {
            const name: Signal<string> = {
                subscribers: new Set(),

                value: 'abc',
            };

            const subscriber = () => {};

            context.currentSubscriber = subscriber;

            getValue(name);

            expect(name.subscribers.size).toBe(1);

            expect(name.subscribers.has(subscriber)).toBe(true);
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
            const count: Signal<number> = {
                subscribers: new Set(),

                value: 0,
            };

            expect(setValue(count, 1)).toBe(1);

            type User = {
                name: string;
            };

            const user: Signal<User> = {
                subscribers: new Set(),

                value: { name: 'a' },
            };

            const prevUser = user.value;

            user.value.name = 'b';

            expect(setValue(user, user.value)).toBe(prevUser);
        });

        testSetValue(setValue);
    });

    describe('postSetValue', () => {
        it('should return the previous `signal.value`', () => {
            const count: Signal<number> = {
                subscribers: new Set(),
                value: 0,
            };

            const prevValue = count.value;
            expect(postSetValue(count, 1)).toBe(prevValue);
            for (let i = 1; i < 100; i++) {
                const prevValue = count.value;

                expect(postSetValue(count, i)).toBe(prevValue);
            }
        });

        testSetValue(postSetValue);
    });
});
