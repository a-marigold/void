import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { flush } from '../context';

import { context } from '../context';

import type { Subscriber } from '../types';

import { resetContext } from './testingUtils';

beforeEach(resetContext);
describe('batch', () => {
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
