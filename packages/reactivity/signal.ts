import type {
    Signal,
    SignalGetter,
    SignalSetter,
    Subscribers,
} from './types/Signal';

import { currentComputation } from './context';

export type SignalFactory = {
    <T>(value: T): Signal<T>;

    <T>(value?: T): Signal<T | undefined>;

    (): Signal<unknown>;
};

const signal: SignalFactory = <T>(value?: T): Signal<T | undefined> => {
    const subscribers: Subscribers = new Set();

    const getter: SignalGetter<T | undefined> = () => {
        if (currentComputation) {
            subscribers.add(currentComputation);
        }
        return value;
    };

    const setter: SignalSetter<T | undefined> = (newValue) => {
        value = newValue;

        subscribers.forEach((subsciber) => {
            subsciber.fn();
        });
    };

    return { get: getter, set: setter };
};
