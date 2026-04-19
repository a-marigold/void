import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { context, flush, scheduleSubscribers } from '../context';

import type { Subscriber, Signal } from '../types';

import { resetContext } from './__testingUtils__';

beforeEach(resetContext);

describe('flush', () => {
    it('should run `fn` and `cleanup` of every subscriber of `context.scheduledSubscribers`', () => {
        const subscribers: Subscriber[] = [
            { fn: vi.fn(), cleanup: vi.fn(), isIdle: true },

            { fn: vi.fn(), cleanup: vi.fn(), isIdle: true },
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
            { fn: () => {}, cleanup: undefined, isIdle: true },
            { fn: () => {}, cleanup: undefined, isIdle: true },
        );

        context.scheduledDependencies.add(new Set());

        flush();

        expect(context.isIdle).toBe(false);

        expect(context.scheduledSubscribers.length).toBe(0);
        expect(context.scheduledDependencies.size).toBe(0);
    });

    it.serial(
        'should clear `context` object properties even if there are uncaught errors inside subscribers',

        () => {
            context.isIdle = true;

            context.scheduledSubscribers.push(
                {
                    fn: () => {
                        throw '';
                    },

                    cleanup: undefined,
                    isIdle: true,
                },
                {
                    fn: () => {
                        throw '';
                    },

                    cleanup: undefined,
                    isIdle: true,
                },
            );

            context.scheduledDependencies.add(new Set());

            expect.assertions(3);

            try {
                flush();
            } catch (error) {
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
        });

        flush();

        expect(val).toBe('fn' as typeof val);
    });
});

describe('scheduleSubscribers', () => {
    it('should add every subscriber of `subscribers` to `scheduledSubscribers` and add `subscribers` to `scheduledDependencies`', () => {
        const subscribers: Set<Subscriber> = new Set([
            { fn: () => {}, cleanup: undefined, isIdle: true },

            { fn: () => {}, cleanup: undefined, isIdle: true },
            { fn: () => {}, cleanup: undefined, isIdle: true },
        ]);

        scheduleSubscribers(subscribers);

        expect(context.scheduledSubscribers.length).toBe(subscribers.size);

        for (const subscriber of context.scheduledSubscribers) {
            expect(subscribers).toContain(subscriber);
        }

        expect(context.scheduledDependencies.size).toBe(1);
        expect(context.scheduledDependencies).toContain(subscribers);
    });

    it('should not add the same subscribers to `context.scheduledSubscribers` if called multiple times', () => {
        const subscribers: Set<Subscriber> = new Set([
            {
                fn: () => {},
                cleanup: undefined,
                isIdle: true,
            },

            {
                fn: () => {},
                cleanup: undefined,
                isIdle: true,
            },
        ]);

        scheduleSubscribers(subscribers);

        expect(context.scheduledSubscribers.length).toBe(subscribers.size);

        scheduleSubscribers(subscribers);

        expect(context.scheduledSubscribers.length).toBe(subscribers.size);
        console.log(context.scheduledSubscribers.length);
        expect(
            context.scheduledSubscribers.every((subscriber) => subscribers.has(subscriber)),
        ).toBe(true);
    });

    it('should not add the same subscribers from different `subscribers` to `context.scheduledSubscribers`', () => {
        const subList: Subscriber[] = [
            {
                fn: () => {},
                cleanup: undefined,
                isIdle: true,
            },
            {
                fn: () => {},
                cleanup: undefined,
                isIdle: true,
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
