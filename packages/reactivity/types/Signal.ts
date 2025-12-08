import type { Computation } from './Computation';

export type SignalGetter<T> = () => T;
export type SignalSetter<T> = (newValue: T) => void;

export type Subscribers = Set<Computation>;

export type Signal<T> = { get: SignalGetter<T>; set: SignalSetter<T> };
