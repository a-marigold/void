import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { context, flush, scheduleSubscribers } from '../context';

import type { Subscriber, Signal } from '../types';

import { resetContext } from './testingUtils';

beforeEach(resetContext);

describe('flush', () => {
    it('should run every subscriber of `context.scheduledSubscribers`', () => {
        const subscribers: Subscriber[] = [vi.fn(), vi.fn(), vi.fn()];

        for (const subscriber of subscribers) {
            context.scheduledSubscribers.add(subscriber);
        }

        flush();

        for (const subscriber of subscribers) {
            expect(subscriber).toHaveBeenCalledTimes(1);
        }
    });

    it('should clear `context` object properties after subscribers running', () => {
        context.isScheduled = true;

        context.scheduledSubscribers.add(() => {});
        context.scheduledSubscribers.add(() => {});
        context.scheduledDependencies.add(new Set());

        flush();

        expect(context.isScheduled).toBe(false);

        expect(context.scheduledSubscribers.size).toBe(0);
        expect(context.scheduledDependencies.size).toBe(0);
    });

    it.serial(
        'should clear `context` object properties even if there are uncaught errors inside subscribers',

        () => {
            const errorText = 'error';

            context.isScheduled = true;

            context.scheduledSubscribers.add(() => {});
            context.scheduledSubscribers.add(() => {
                throw errorText;
            });

            context.scheduledDependencies.add(new Set());

            expect.assertions(4);
            try {
                flush();
            } catch (error) {
                expect(error).toBe(errorText);
                expect(context.isScheduled).toBe(false);

                expect(context.scheduledSubscribers.size).toBe(0);
                expect(context.scheduledDependencies.size).toBe(0);
            }
        },
    );
});

describe('scheduleSubscribers', () => {
    it('should add every subscriber of `subscribers` to `scheduledSubscribers` and add `subscribers` to `scheduledDependencies`', () => {
        const count: Signal<number> = {
            subscribers: new Set([() => {}, () => {}, () => {}]),
            value: 0,
        };

        scheduleSubscribers(
            count.subscribers,

            context.scheduledSubscribers,

            context.scheduledDependencies,
        );
        expect(context.scheduledSubscribers.size).toBe(count.subscribers.size);

        for (const subscriber of count.subscribers) {
            expect(context.scheduledSubscribers.has(subscriber)).toBe(true);
        }

        expect(context.scheduledDependencies.size).toBe(1);

        expect(context.scheduledDependencies.has(count.subscribers)).toBe(true);
    });

    it('should do nothing if called several times', () => {
        const count: Signal<number> = {
            subscribers: new Set([() => {}, () => {}, () => {}]),

            value: 0,
        };

        const scheduledSubscribersAddSpy = vi.spyOn(
            context.scheduledSubscribers,
            'add',
        );
        const scheduledDependenciesAddSpy = vi.spyOn(
            context.scheduledDependencies,
            'add',
        );

        for (let i = 0; i <= 16; i++) {
            scheduleSubscribers(
                count.subscribers,

                context.scheduledSubscribers,
                context.scheduledDependencies,
            );
        }

        expect(scheduledSubscribersAddSpy).toHaveBeenCalledTimes(
            count.subscribers.size,
        );
        expect(scheduledDependenciesAddSpy).toHaveBeenCalledTimes(1);
    });
});
