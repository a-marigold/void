type Subscriber = () => void;

export type Signal<T = unknown> = { subscribers: Set<Subscriber>; value: T };

export type GetValue = <T>(signal: Signal<T>) => T;
export type SetValue = <T>(signal: Signal<T>, value: T) => T;
