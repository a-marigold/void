import { describe, it, expect, beforeEach, vi } from 'bun:test';

import { getValue, setValue, postSetValue } from '../signal';

import { context } from '../context';
import type { Signal, SetValue } from '../types';

import { resetContext } from './__testingUtils__';

/**
 * @param setter `setValue` or `postSetValue`.
 */

const testSignalSetter = (setter: SetValue): void => {
    it('should flush subscribers only once even if setter called multiple times', () => {
        const queueMicrotaskSpy = vi.spyOn(globalThis, 'queueMicrotask');

        const count: Signal<number> = {
            subscribers: new Set([
                { fn: () => {}, cleanup: () => {}, isIdle: true, isEager: false },
                { fn: () => {}, cleanup: undefined, isIdle: true, isEager: true },
            ]),
            value: 0,
        };

        setter(count, 1);
        setter(count, 2);
        setter(count, 3);

        expect(context.scheduledDependencies).toContain(count.subscribers);

        expect(queueMicrotaskSpy).toBeCalledTimes(1);
    });

    it('should not flush subscribers if `value` is the same', () => {
        const sameVal = Symbol();

        const queueMicrotaskSpy = vi.spyOn(globalThis, 'queueMicrotask');
        const sym: Signal = {
            subscribers: new Set([
                { fn: () => {}, cleanup: () => {}, isIdle: true, isEager: false },
                { fn: () => {}, cleanup: undefined, isIdle: true, isEager: true },
            ]),
            value: sameVal,
        };

        setter(sym, sameVal);
        setter(sym, sameVal);

        setter(sym, sameVal);

        expect(queueMicrotaskSpy).toHaveBeenCalledTimes(0);
    });
};

beforeEach(resetContext);

describe('getValue', () => {
    it('should always return the current value of a signal', () => {
        const value = Symbol();

        const sym: Signal<symbol> = {
            subscribers: new Set(),
            value,
        };

        expect(getValue(sym)).toBe(value);
    });

    it('should add `context.currentSubscriber` to `signal.subscribers`', () => {
        const name: Signal<string> = {
            subscribers: new Set(),

            value: 'abc',
        };

        context.currentSubscriber = {
            fn: () => {},
            cleanup: undefined,

            isIdle: true,
            isEager: true,
        };

        getValue(name);

        expect(name.subscribers).toContain(context.currentSubscriber);
    });
});

describe('setValue', () => {
    it('should return the same `value`', () => {
        const user: Signal = {
            subscribers: new Set(),

            value: { name: 'a' },
        };

        const prevUser = user.value;

        expect(setValue(user, user.value)).toBe(prevUser);

        const newUser = { name: 'a' };

        expect(setValue(user, newUser)).toBe(newUser);
    });

    testSignalSetter(setValue);
});

describe('postSetValue', () => {
    it('should return the previous `signal.value`', () => {
        const user: Signal = {
            subscribers: new Set(),

            value: { name: 'a' },
        };

        const prevValue = user.value;

        expect(postSetValue(user, { name: 'a' })).toBe(prevValue);
    });

    testSignalSetter(postSetValue);
});
