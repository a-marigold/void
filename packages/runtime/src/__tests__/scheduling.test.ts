import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { context, flush, scheduleSubscribers } from '../context';

import type { Subscriber, Signal } from '../types';

import { resetContext } from './__testingUtils__';

beforeEach(resetContext);

describe('flush', () => {
    it('should run `fn` and `cleanup` of every subscriber of `context.scheduledSubscribers`', () => {
        const subscribers: Subscriber[] = [
            { fn: vi.fn(), cleanup: vi.fn() },
            { fn: vi.fn(), cleanup: vi.fn() },
            { fn: vi.fn(), cleanup: vi.fn() },
        ];

        for (const subscriber of subscribers) {
            context.scheduledSubscribers.add(subscriber);
        }

        flush();

        for (const subscriber of subscribers) {
            expect(subscriber.fn).toHaveBeenCalledTimes(1);
            expect(subscriber.cleanup).toHaveBeenCalledTimes(1);
        }
    });

    it('should clear `context` object properties after subscribers are run', () => {
        context.isScheduled = true;

        context.scheduledSubscribers.add({ fn: () => {}, cleanup: undefined });
        context.scheduledSubscribers.add({ fn: () => {}, cleanup: undefined });

        context.scheduledDependencies.add(new Set());

        flush();

        expect(context.isScheduled).toBe(false);

        expect(context.scheduledSubscribers.size).toBe(0);
        expect(context.scheduledDependencies.size).toBe(0);
    });

    it.serial(
        'should clear `context` object properties even if there are uncaught errors inside subscribers',

        () => {
            context.isScheduled = true;

            context.scheduledSubscribers.add({ fn: () => {}, cleanup: undefined });

            context.scheduledSubscribers.add({
                fn: () => {
                    throw '';
                },
                cleanup: undefined,
            });

            context.scheduledDependencies.add(new Set());

            expect.assertions(3);

            try {
                flush();
            } catch (error) {
                expect(context.isScheduled).toBe(false);

                expect(context.scheduledSubscribers.size).toBe(0);
                expect(context.scheduledDependencies.size).toBe(0);
            }
        },
    );

    it('should run subscriber `cleanup` before `fn`', () => {
        const fnVal = Symbol();
        const cleanupVal = Symbol();
        let val: symbol = Symbol();

        context.scheduledSubscribers.add({
            fn: () => {
                val = fnVal;
            },

            cleanup: () => {
                val = cleanupVal;
            },
        });

        flush();

        expect(val).toBe(fnVal);
    });
});

describe('scheduleSubscribers', () => {
    it('should add every subscriber of `subscribers` to `scheduledSubscribers` and add `subscribers` to `scheduledDependencies`', () => {
        const count: Signal<number> = {
            subscribers: new Set([
                { fn: () => {}, cleanup: undefined },

                { fn: () => {}, cleanup: undefined },

                { fn: () => {}, cleanup: undefined },
            ]),

            value: 0,
        };

        scheduleSubscribers(count.subscribers);

        expect(context.scheduledSubscribers.size).toBe(count.subscribers.size);

        for (const subscriber of count.subscribers) {
            expect(context.scheduledSubscribers.has(subscriber)).toBe(true);
        }

        expect(context.scheduledDependencies.size).toBe(1);

        expect(context.scheduledDependencies.has(count.subscribers)).toBe(true);
    });
});
