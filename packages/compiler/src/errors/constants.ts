import type { CompileErrorMessage, VoidKeyword, VoidConstruction } from '@void/shared';

/**
 * Object with messages of errors that appear while `void-js` file is compiling.
 */
export const errorMessages = {
	IDENTIFIER_EXPECTED: (keyword: VoidKeyword | VoidConstruction) =>
		("Identifier of '" + keyword + "' expected.") as CompileErrorMessage,
	/**
	 *
	 * @param token For example, `(` or `=`.
	 *
	 *
	 *
	 */
	TOKEN_EXPECTED: (token: string) => ("'" + token + "' expected.") as CompileErrorMessage,
	KEYWORD_AS_VARIABLE_NAME: (keyword: VoidKeyword) =>
		("'" +
			keyword +
			"' is a 'void-js' keyword and is not allowed as variable declaration name.") as CompileErrorMessage,
	/**
	 *
	 * Appears when `signal` is used with destructuring.
	 */
	SIGNAL_DECL_DESTRUCTURING: "Cannot declare 'signal' by using destructuring.",
	/**
	 *
	 * Appears when `signal` is used with destructuring.
	 */
	MEMO_DECL_DESTRUCTURING: "Cannot declare 'memo' by using destructuring.",

	SIGNAL_WITHOUT_INITIAL_VALUE: "'signal' must have an initial value.",
	MEMO_WITHOUT_INITIAL_VALUE: "'memo' must have an initial value.",

	SIGNAL_MULTIPLE_DECLARATORS: "'signal' cannot have more than 1 declarator.",
	MEMO_MULTIPLE_DECLARATORS: "'memo' cannot have more than 1 declarator.",

	NON_ARROW_EFFECT: 'Effect can only be an arrow function.',

	MULTIPLE_COMPONENTS: 'Multiple components are not allowed.',

	COMPONENT_NAME_CAPTIALIZE: 'Component name must be capitalized.',
	/**
	 *
	 *
	 *   @example
	 * ```tsx
	 * const jsx = <div></div>; // Error
	 *
	 * <button></button>; // Error
	 *
	 * export <App> () {
	 *   <div></div>; // Error, it is not in return
	 *   return (
	 *     <> // No error
	 *       <input
	 *         onInput={() => {
	 *  	     return <div> </div>; // Error, it is not in Component return
	 *         }}
	 *       /> // No error for input
	 *
	 *       {cond ? <span> hello </span> : <p> world </p>} // No error, it is in return
	 *     </>
	 *   ),
	 * }
	 *
	 *
	 *
	 *
	 *
	 *
	 *
	 *
	 *
	 *
	 *
	 *
	 *
	 *
	 *
	 */

	COMPONENT_NON_DESTRUCTURED_PROPS: 'Component props must be destructured.',

	COMPONENT_INVALID_SPEC_PROP:
		'Cannot declare special component prop by using rest or destructuring.',

	COMPONENT_INVALID_REST_PROP: 'Rest prop can only be an identifier.',

	JSX_NOT_ALLOWED: 'JSX elements are not allowed here.',

	/**
	 * `JSXMemberExpression` and `JSXNamespasedName` are not allowed as names of JSX elements.
	 */
	JSX_INVALID_EL_NAME: 'Invalid JSX element name.',

	JSX_SPREAD_CHILDREN: 'Spread JSX children are not allowed.',

	/**
	 *
	 *  	@example
	 * ```tsx
	 * <> - This fragment is OK because it is the root
	 *   <div>
	 *     <> - Error appears here, because the fragment is not needed
	 *       <span> Hello </span>
	 *     </>
	 *   </div>
	 *
	 *   <> </> - Error, because this fragment is not needed
	 * </>
	 *
	 *
	 *
	 *
	 *
	 */

	JSX_NESTED_FRAGMENT: 'JSX fragment cannot not appear here.',

	JSX_EMPTY_EXPRESSION: 'Expression expected.',

	/**
	 *  @example
	 *
	 * ```tsx
	 * <div className='dv'/> - Error
	 * <div className={'dv'}/> - No error
	 * ```
	 */
	JSX_ATTR_NON_WRAPPED: 'Attribute value must be wrapped in curly brackets.',
	JSX_ATTR_INVALID_NAME: 'Invalid attribute name.',
	JSX_ATTR_WITHOUT_VALUE: 'Attribute must have a value.',
	JSX_ATTR_DUPLICATE: 'Cannot define the same attribute multiple times.',
	JSX_ATTR_REF_INVALID_VALUE:
		"'ref' attribute value can only be a default variable or a 'ref' component prop.",

	JSX_SPEC_PROP_NON_IDENTIFIER: 'Special component prop can only be an identifier.',

	JSX_CHILDREN_RPOP: 'Cannot pass children by using prop.',

	JSX_EXPR_CONDITION: 'Use <If> buitltin component instead of condititons.',

	JSX_NEED_SELF_CLOSING_EL: 'Use self-closing JSX element when it has no children.',
} as const satisfies Record<
	string,
	| CompileErrorMessage
	| ((...args: VoidKeyword[]) => CompileErrorMessage)
	| ((...args: VoidConstruction[]) => CompileErrorMessage)
	| ((...args: (VoidKeyword | VoidConstruction)[]) => CompileErrorMessage)
>;
