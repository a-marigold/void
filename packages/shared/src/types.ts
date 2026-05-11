/**
 * Names of DOM events in JSX style that are delegated in `void-js`.
 */
export type DelegableEvent =
	| 'onClick'
	| 'onPointerDown'
	| 'onPointerUp'
	| 'onInput'
	| 'onChange'
	| 'onKeyDown'
	| 'onKeyUp'
	| 'onSubmit';

/**
 *
 * Property name of delegated event attached to DOM element.
 *
 * @example
 * ```typescript
 * el.$Click = handler1;
 * el.$PointerUp = handler2;
 */
export type DelegatedEventProp = `$${DelegableEvent extends `on${infer E}` ? E : never}`;
