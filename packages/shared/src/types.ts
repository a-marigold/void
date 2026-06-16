/**
 * Names of DOM events in that are delegated in `void-js`.
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
 * Names of `void-js` runtime API exports to be imported in compiled file.
 */
export type RuntimeApiName =
	| 'getValue'
	| 'setValue'
	| 'postSetValue'
	| 'createEffect'
	| 'createMemo'
	| 'computeMemo'
	| 'createComponent'
	| 'insert'
	| 'mergeAttrs'
	| `${DelegableEvent}`
	| RuntimeTypeName;

/**
 *
 * Names of `void-js` reactivity API that should be imported as types.
 */

export type RuntimeTypeName = 'Signal';

type ReactiveKeyword = 'signal' | 'memo';

/**
 *
 *
 *
 *
 * All the new keywords that `void-js` provides.
 */
export type VoidKeyword = ReactiveKeyword | 'ref' | 'effect';

/**
 *
 * `void-js` keywords that appear in component props.
 */
export type PropsVoidKeyword = Extract<VoidKeyword, 'signal' | 'memo' | 'ref'>;

/**
 *
 * `void-js` specific syntax constructions like components.
 */

export type VoidConstruction = 'component';

type CompileErrorMessages = {
	IDENTIFIER_EXPECTED: `Identifier of '${VoidKeyword | VoidConstruction}' expected.`;
	TOKEN_EXPECTED: `'${string}' expected.`;

	KEYWORD_AS_VARIABLE_NAME: `'${VoidKeyword}' is a 'void-js' keyword and is not allowed as variable declaration name.`;

	REACTIVE_DECL_DESTRUCTURING: `Cannot declare '${ReactiveKeyword}' by using destructuring.`;
	REACTIVE_WITHOUT_INITIAL_VALUE: `'${ReactiveKeyword}' must have an initial value.`;
	REACTIVE_MULTIPLE_DECLARATORS: `'${ReactiveKeyword}' cannot have more than 1 declarator.`;
	NON_ARROW_EFFECT: 'Effect can only be an arrow function.';

	MULTIPLE_COMPONENTS: 'Multiple components are not allowed.';
	COMPONENT_NON_BLOCK_BODY: 'Block statement expected.';
	COMPONENT_NAME_CAPTIALIZE: 'Component name must be capitalized.';
	COMPONENT_NON_DESTRUCTURED_PROPS: 'Component props must be destructured.';
	COMPONENT_INVALID_SPEC_PROP: 'Cannot declare special component prop by using rest or destructuring.';

	JSX_NOT_ALLOWED: 'JSX elements are not allowed here.';
	JSX_INVALID_EL_NAME: 'Invalid JSX element name.';
	JSX_SPREAD_CHILDREN: 'Spread JSX children are not allowed.';
	JSX_NESTED_FRAGMENT: 'JSX fragment cannot not appear here.';
	JSX_EMPTY_EXPRESSION: 'Expression expected.';

	JSX_ATTR_NON_WRAPPED: 'Attribute value must be wrapped in figure brackets.';
	JSX_ATTR_INVALID_NAME: 'Invalid attribute name.';
	JSX_ATTR_WITHOUT_VALUE: 'Attribute must have a value.';
	JSX_ATTR_DUPLICATE: 'Cannot define the same attribute multiple times.';
	JSX_ATTR_REF_INVALID_VALUE: "'ref' attribute value can only be a default variable or a 'ref' component prop.";

	JSX_SPEC_PROP_NON_IDENTIFIER: 'Special component prop can only be an identifier.';

	JSX_NEED_SELF_CLOSING_EL: 'Use self-closing JSX element when it has no children.';
};

/**
 *
 *
 *
 *
 * Errors appeared only during `void-js` file compilation.
 */

export type CompileErrorMessage = CompileErrorMessages[keyof CompileErrorMessages];

/**
 *
 * Messages of `void-js`-specific errors.
 */

export type ErrorMessage = CompileErrorMessage;

/**
 *
 *
 * Prefix used by `void-js` compiler to generate unique identifier names.
 *
 */

export type VoidIdPrefix = '_$';
