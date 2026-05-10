/**
 * Names of DOM events that are delegated in `void-js`.
 *
 * This events are attached to DOM elements with {@link DelegableEventPrefix} instead of `on`.
 *
 * `on` prefix included in this types because
 *
 * @example
 *
 * ```typescript
 * el.$Click; // instead of `el.onClick`
 * el.$Input; // instead of `el.onInput`
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
 * Prefix of delegated event attached to DOM element.
 *
 * Following event name must be in PascalCase.
 *
 * Used to prevent collisions.
 *
 * @examples
 * ```typescript
 * el.$Click;
 * el.$Input;
 * el.$PointerDown;
 * ```
 */
export type DelegableEventPrefix = '$';
