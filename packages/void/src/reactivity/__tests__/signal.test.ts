import { describe, it, expect, beforeEach, spyOn } from 'bun:test';

import { get, set, postSet } from '../signal';

import { context } from '../context';
import type { Signal, SetValue } from '../types';

const setValueTests = (setFunction: SetValue): void => {
    it('should call `queueMicrotask` and mutate `context.scheduledSubscribers` if `context.isScheduled` is false', () => {
        const queueMicrotaskSpy = spyOn(globalThis, 'queueMicrotask');

        const count: Signal<number> = {
            subscribers: new Set([() => {}, () => {}, () => {}]),

            value: 0,
        };

        const prevScheduledSubsSize = context.scheduledSubscribers;

        setFunction(count, 1);

        expect(queueMicrotaskSpy).toHaveBeenCalled();

        expect(context.scheduledSubscribers.size).not.toBe(
            prevScheduledSubsSize,
        );

        expect(context.scheduledSubscribers.size).toBe(count.subscribers.size);

        for (const sub of count.subscribers) {
            expect(context.scheduledSubscribers.has(sub)).toBe(true);
        }

        queueMicrotaskSpy.mockClear();
    });

    it('should not call `queueMicrotask` if `context.isScheduled` is true', () => {
        const queueMicrotaskSpy = spyOn(globalThis, 'queueMicrotask');

        const count: Signal<number> = {
            subscribers: new Set([() => {}]),

            value: 0,
        };

        const iterations = 100;
        for (let i = 0; i <= iterations; i++) {
            setFunction(count, i);
        }

        expect(queueMicrotaskSpy).toHaveBeenCalledTimes(1);

        expect(count.value).toBe(iterations);

        expect(context.scheduledSubscribers.size).toBe(count.subscribers.size);

        for (const sub of count.subscribers) {
            expect(context.scheduledSubscribers.has(sub)).toBe(true);
        }
    });
};

beforeEach(() => {
    context.currentSubscriber = null;
    context.isScheduled = false;

    context.scheduledSubscribers.clear();

    context.scheduledSignals.clear();
});

describe('Signal', () => {
    describe('get', () => {
        it('should always return the current value of a signal', () => {
            const count: Signal<number> = {
                subscribers: new Set(),

                value: 0,
            };

            expect(get(count)).toBe(0);

            count.value = 1;

            expect(get(count)).toBe(1);
        });

        it('should add `context.currentSubscriber` to `signal.subscribers` if `context.currentSubscriber` is not undefined', () => {
            const name: Signal<string> = {
                subscribers: new Set(),

                value: 'abc',
            };

            const subscriber = () => {};

            context.currentSubscriber = subscriber;

            get(name);

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

            get(count);

            expect(count.subscribers.size).toBe(prevSize);
        });
    });

    describe('set', () => {
        it('should return the same `value` argument', () => {
            const count: Signal<number> = {
                subscribers: new Set(),

                value: 0,
            };

            expect(set(count, 1)).toBe(1);

            type User = {
                name: string;
            };

            const user: Signal<User> = {
                subscribers: new Set(),

                value: { name: 'a' },
            };

            const prevUser = user.value;

            user.value.name = 'b';

            expect(set(user, user.value)).toBe(prevUser);
        });

        setValueTests(set);
    });

    describe('postSet', () => {});
});
