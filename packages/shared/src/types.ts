/**
 * Name of DOM event in JSX style that шы delegated in `void-js`.
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

type ReactiveKeyword = 'signal' | 'memo';

/**
 * All the new keywords that `void-js` provides.
 */
export type VoidKeyword = ReactiveKeyword | 'effect';

/**
 *
 * `void-js` specific syntax constructions like components.
 */

export type VoidConstruction = 'component';

type CompileErrorMessages = {
	IDENTIFIER_EXPECTED: `Identifier of '${VoidKeyword | VoidConstruction}' expected.`;

	TOKEN_EXPECTED: `'${string}' expected.`;

	KEYWORD_AS_VARIABLE_NAME: `'${VoidKeyword}' is a 'void-js' keyword and is not allowed as variable declaration name.`;

	REACTIVE_DECL_DESTRUCTURING: `Cannot declare '${ReactiveKeyword}' using destructuring.`;

	REACTIVE_WITHOUT_INITIAL_VALUE: `'${ReactiveKeyword}' must have an initial value.`;

	REACTIVE_MULTIPLE_DECLARATORS: `'${ReactiveKeyword}' cannot have more than 1 declarator.`;

	MULTIPLE_COMPONENTS: 'Multiple components are not allowed.';

	COMPONENT_NON_BLOCK_BODY: 'Block statement expected.';

	COMPONENT_NAME_CAPTIALIZE: 'Component name must be capitalized.';

	JSX_OUTSIDE_COMPONENT_RETURN: 'JSX elements are not allowed outside component return statement.';

	JSX_INVALID_EL_NAME: 'Invalid JSX element name.';

	JSX_SPREAD_CHILDREN: 'Spread JSX children are not allowed.';

	JSX_NESTED_FRAGMENT: 'JSX fragment should not appear here.';

	JSX_EMPTY_EXPRESSION: 'Expression expected.';

	JSX_WRAPPED_ATTR: 'Attribute value must be wrapped in figure brackets.';

	JSX_ATTR_INVALID_NAME: 'Invalid attribute name.';

	JSX_ATTR_WITHOUT_VALUE: 'Attribute must have a value.';

	JSX_ATTR_DUPLICATE: 'There cannot be a duplicate in attributes.';

	JSX_NEED_SELF_CLOSING_EL: 'Use self-closing JSX element when it has no children.';
};

/**
 * Errors appeared only during `void-js` file compilation.
 */

export type CompileErrorMessage = CompileErrorMessages[keyof CompileErrorMessages];

/**
 *
 *
 *
 *
 *
 *
 * Messages of `void-js`-specific errors.
 *
 *
 *
 *
 *
 */
export type ErrorMessage = CompileErrorMessage;
