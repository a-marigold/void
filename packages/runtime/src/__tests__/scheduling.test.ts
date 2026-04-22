import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { context, flush, scheduleEffects } from '../context';

import type { Effect } from '../types';

import { resetContext } from './__testingUtils__';

beforeEach(resetContext);

describe('flush', () => {
    it('should run `fn` and `cleanup` of every subscriber of `context.scheduledSubscribers`', () => {
        const subscribers: Effect[] = [
            { fn: vi.fn(), cleanup: vi.fn(), isIdle: true, isEager: false },

            { fn: vi.fn(), cleanup: vi.fn(), isIdle: true, isEager: false },
        ];

        for (const subscriber of subscribers) {
            context.scheduledEffects.push(subscriber);
        }

        flush();

        for (const subscriber of subscribers) {
            expect(subscriber.fn).toHaveBeenCalledTimes(1);
            expect(subscriber.cleanup).toHaveBeenCalledTimes(1);
        }
    });

    it('should clear `context` object properties after subscribers are run', () => {
        context.isIdle = true;

        context.scheduledEffects.push(
            { fn: () => {}, cleanup: undefined, isIdle: true, isEager: false },
            { fn: () => {}, cleanup: undefined, isIdle: true, isEager: false },
        );

        context.scheduledDependencies.add(new Set());

        flush();

        expect(context.isIdle).toBe(false);

        expect(context.scheduledEffects.length).toBe(0);

        expect(context.scheduledDependencies.size).toBe(0);
    });

    it.serial(
        'should clear `context` object properties and pass error when there are uncaught errors inside subscribers',

        () => {
            expect.assertions(4);

            const err = Symbol();

            try {
                context.isIdle = true;

                context.scheduledEffects.push(
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

                expect(context.scheduledEffects.length).toBe(0);
                expect(context.scheduledDependencies.size).toBe(0);
            }
        },
    );

    it('should run subscriber `cleanup` before `fn`', () => {
        let val: 'fn' | 'cleanup' | '' = '';

        context.scheduledEffects.push({
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
        const subscribers: Set<Effect> = new Set([
            { fn: () => {}, cleanup: undefined, isIdle: true, isEager: false },
            { fn: () => {}, cleanup: undefined, isIdle: true, isEager: false },
            { fn: () => {}, cleanup: undefined, isIdle: true, isEager: false },
        ]);

        scheduleEffects(subscribers);

        expect(context.scheduledEffects.length).toBe(subscribers.size);

        for (const subscriber of context.scheduledEffects) {
            expect(subscribers).toContain(subscriber);
        }
    });

    it('should not add subscribers with `isEager: true` to `context.scheduledSubscribers` and should call them immediatly', () => {
        const eagerSubscribers: Effect[] = [
            { fn: vi.fn(), cleanup: undefined, isIdle: true, isEager: true },

            { fn: vi.fn(), cleanup: undefined, isIdle: true, isEager: true },
        ];

        const subscribers: Set<Effect> = new Set([
            ...eagerSubscribers,

            { fn: () => {}, cleanup: () => {}, isIdle: true, isEager: false },

            { fn: () => {}, cleanup: () => {}, isIdle: true, isEager: false },
        ]);
        scheduleEffects(subscribers);

        for (const subscriber of eagerSubscribers) {
            expect(subscriber.fn).toHaveBeenCalledTimes(1);
        }

        expect(context.scheduledEffects.length).toBe(2);
        expect(context.scheduledEffects.some((subscriber) => subscriber.isEager)).toBe(false);
    });

    it('should not add the same subscribers to `context.scheduledSubscribers` if called multiple times', () => {
        const subscribers: Set<Effect> = new Set([
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

        scheduleEffects(subscribers);

        expect(context.scheduledEffects.length).toBe(subscribers.size);

        scheduleEffects(subscribers);

        expect(context.scheduledEffects.length).toBe(subscribers.size);

        expect(context.scheduledEffects.every((subscriber) => subscribers.has(subscriber))).toBe(
            true,
        );
    });

    it("should not add the same subscribers from different Set's to `context.scheduledSubscribers`", () => {
        const subList: Effect[] = [
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

        const subscribers1: Set<Effect> = new Set(subList);
        const subscribers2: Set<Effect> = new Set(subList);

        scheduleEffects(subscribers1);

        expect(context.scheduledEffects.length).toBe(subList.length);

        scheduleEffects(subscribers2);

        expect(context.scheduledEffects.length).toBe(subList.length);

        expect(context.scheduledEffects.every((subscriber) => subscribers1.has(subscriber))).toBe(
            true,
        );
    });
});
