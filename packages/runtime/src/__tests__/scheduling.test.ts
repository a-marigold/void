import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { context, flush, scheduleSubscribers } from '../context';

import type { Subscriber } from '../types';

import { resetContext } from './__testingUtils__';

beforeEach(resetContext);

describe('flush', () => {
    it('should run `fn` and `cleanup` of every subscriber of `context.scheduledSubscribers`', () => {
        const subscribers: Subscriber[] = [
            { fn: vi.fn(), cleanup: vi.fn(), isIdle: true, isEager: false },

            { fn: vi.fn(), cleanup: vi.fn(), isIdle: true, isEager: false },
        ];

        for (const subscriber of subscribers) {
            context.scheduledSubscribers.push(subscriber);
        }

        flush();

        for (const subscriber of subscribers) {
            expect(subscriber.fn).toHaveBeenCalledTimes(1);
            expect(subscriber.cleanup).toHaveBeenCalledTimes(1);
        }
    });

    it('should clear `context` object properties after subscribers are run', () => {
        context.isIdle = true;

        context.scheduledSubscribers.push(
            { fn: () => {}, cleanup: undefined, isIdle: true, isEager: false },
            { fn: () => {}, cleanup: undefined, isIdle: true, isEager: false },
        );

        context.scheduledDependencies.add(new Set());

        flush();

        expect(context.isIdle).toBe(false);

        expect(context.scheduledSubscribers.length).toBe(0);
        expect(context.scheduledDependencies.size).toBe(0);
    });

    it.serial(
        'should clear `context` object properties and pass error when there are uncaught errors inside subscribers',

        () => {
            expect.assertions(4);

            const err = Symbol();

            try {
                context.isIdle = true;

                context.scheduledSubscribers.push(
                    {
                        fn: () => {
                            throw err;
                        },

                        cleanup: undefined,
                        isIdle: true,
                        isEager: false,
                    },

                    {
                        fn: () => {
                            throw err;
                        },

                        cleanup: undefined,

                        isIdle: true,

                        isEager: false,
                    },
                );

                context.scheduledDependencies.add(new Set());

                flush();
            } catch (error) {
                expect(error).toBe(err);
                expect(context.isIdle).toBe(false);

                expect(context.scheduledSubscribers.length).toBe(0);
                expect(context.scheduledDependencies.size).toBe(0);
            }
        },
    );

    it('should run subscriber `cleanup` before `fn`', () => {
        let val: 'fn' | 'cleanup' | '' = '';

        context.scheduledSubscribers.push({
            fn: () => {
                val = 'fn';
            },

            cleanup: () => {
                val = 'cleanup';
            },

            isIdle: true,

            isEager: false,
        });

        flush();

        expect(val).toBe('fn' as typeof val);
    });
});
describe('scheduleSubscribers', () => {
    it('should add every non eager subscriber of `subscribers` to `scheduledSubscribers` ', () => {
        const subscribers: Set<Subscriber> = new Set([
            { fn: () => {}, cleanup: undefined, isIdle: true, isEager: false },
            { fn: () => {}, cleanup: undefined, isIdle: true, isEager: false },
            { fn: () => {}, cleanup: undefined, isIdle: true, isEager: false },
        ]);

        scheduleSubscribers(subscribers);

        expect(context.scheduledSubscribers.length).toBe(subscribers.size);

        for (const subscriber of context.scheduledSubscribers) {
            expect(subscribers).toContain(subscriber);
        }

        expect(context.scheduledDependencies).toContain(subscribers);
    });

    it('should not add subscribers with `isEager: true` to `context.scheduledSubscribers` and should call them immediatly', () => {
        const eagerSubscribers: Subscriber[] = [
            { fn: vi.fn(), cleanup: undefined, isIdle: true, isEager: true },

            { fn: vi.fn(), cleanup: undefined, isIdle: true, isEager: true },
        ];

        const subscribers: Set<Subscriber> = new Set([
            ...eagerSubscribers,

            { fn: () => {}, cleanup: () => {}, isIdle: true, isEager: false },

            { fn: () => {}, cleanup: () => {}, isIdle: true, isEager: false },
        ]);
        scheduleSubscribers(subscribers);

        for (const subscriber of eagerSubscribers) {
            expect(subscriber.fn).toHaveBeenCalledTimes(1);
        }

        expect(context.scheduledSubscribers.length).toBe(2);
        expect(context.scheduledSubscribers.some((subscriber) => subscriber.isEager)).toBe(false);
    });

    it('should not add the same subscribers to `context.scheduledSubscribers` if called multiple times', () => {
        const subscribers: Set<Subscriber> = new Set([
            {
                fn: () => {},
                cleanup: undefined,
                isIdle: true,
                isEager: false,
            },

            {
                fn: () => {},
                cleanup: undefined,
                isIdle: true,

                isEager: false,
            },
        ]);

        scheduleSubscribers(subscribers);

        expect(context.scheduledSubscribers.length).toBe(subscribers.size);

        scheduleSubscribers(subscribers);

        expect(context.scheduledSubscribers.length).toBe(subscribers.size);

        expect(
            context.scheduledSubscribers.every((subscriber) => subscribers.has(subscriber)),
        ).toBe(true);
    });

    it("should not add the same subscribers from different Set's to `context.scheduledSubscribers`", () => {
        const subList: Subscriber[] = [
            {
                fn: () => {},
                cleanup: undefined,

                isIdle: true,
                isEager: false,
            },
            {
                fn: () => {},
                cleanup: undefined,

                isIdle: true,
                isEager: false,
            },
        ];

        const subscribers1: Set<Subscriber> = new Set(subList);
        const subscribers2: Set<Subscriber> = new Set(subList);

        scheduleSubscribers(subscribers1);

        expect(context.scheduledSubscribers.length).toBe(subList.length);

        scheduleSubscribers(subscribers2);

        expect(context.scheduledSubscribers.length).toBe(subList.length);

        expect(
            context.scheduledSubscribers.every((subscriber) => subscribers1.has(subscriber)),
        ).toBe(true);
    });
});
