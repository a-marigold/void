import { describe, it, expect } from 'bun:test';

import { get, set, postSet } from '../signal';

import { context } from '../context';
import type { Signal } from '../types';

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
});
