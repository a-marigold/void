import { describe, it, expect, beforeEach, vi, spyOn } from 'bun:test';

import { get, set, postSet } from '../signal';

import { context } from '../context';
import type { Signal, SetValue } from '../types';

/**
 *
 * Created because of the same logic of batching in `set` and `postSet`.
 * The logic is the same because it is better for perfromance than separated function for it.
 *
 *
 *
 *
 * @param setFunction `set` or `postSet`.
 *
 *
 *
 *
 */
const testSetValue = (setFunction: SetValue): void => {
    it('should call `queueMicrotask` and mutate `context.scheduledSubscribers` if `context.isScheduled` is false', () => {
        const queueMicrotaskSpy = spyOn(globalThis, 'queueMicrotask');

        const count: Signal<number> = {
            subscribers: new Set([() => {}, () => {}, () => {}]),

            value: 0,
        };

        const prevScheduledSubsSize = context.scheduledSubscribers;

        setFunction(count, 1);

        expect(queueMicrotaskSpy).toHaveBeenCalledTimes(1);

        expect(context.scheduledSubscribers.size).not.toBe(
            prevScheduledSubsSize,
        );

        expect(context.scheduledSubscribers.size).toBe(count.subscribers.size);

        for (const sub of count.subscribers) {
            expect(context.scheduledSubscribers.has(sub)).toBe(true);
        }
    });

    it('should not call `queueMicrotask` if `context.isScheduled` is true', () => {
        const queueMicrotaskSpy = spyOn(globalThis, 'queueMicrotask');

        const count: Signal<number> = {
            subscribers: new Set([() => {}]),

            value: 0,
        };

        const runMany = () => {
            for (let i = 0; i < 100; i++) {
                setFunction(count, i);
            }

            setFunction(count, 1);
            setFunction(count, 2);
            setFunction(count, 3);
            setFunction(count, 4);
            setFunction(count, 5);
            setFunction(count, 6);

            setFunction(count, 7);
        };

        runMany();

        expect(queueMicrotaskSpy).toHaveBeenCalledTimes(1);

        expect(count.value).toBe(7);

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

    vi.clearAllMocks();
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

        testSetValue(set);
    });

    describe('postSet', () => {
        it('should return the previous `signal.value`', () => {
            const count: Signal<number> = {
                subscribers: new Set(),
                value: 0,
            };

            const prevValue = count.value;

            expect(postSet(count, 1)).toBe(prevValue);

            for (let i = 1; i < 100; i++) {
                const prevValue = count.value;

                expect(postSet(count, i)).toBe(prevValue);
            }
        });

        testSetValue(postSet);
    });
});
