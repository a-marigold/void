import type { ErrorMessage, VoidKeyword, VoidConstruction } from '@void/shared';

/**
 * Object with messages of errors that appear while `void-js` file is compiling.
 */
export const errorMessages = {
	IDENTIFIER_EXPECTED: (keyword: VoidKeyword | VoidConstruction) =>
		("Identifier of '" + keyword + "' expected.") as ErrorMessage,
	/**
	 *
	 * @param token For example, `(` or `=`.
	 *
	 *
	 *
	 */
	TOKEN_EXPECTED: (token: string) => ("'" + token + "' expected.") as ErrorMessage,
	KEYWORD_AS_VARIABLE_NAME: (keyword: VoidKeyword) =>
		("'" +
			keyword +
			"' is a 'void-js' keyword and is not allowed as variable declaration name.") as ErrorMessage,
	/**
	 *
	 * Appears when `signal` is used with destructuring.
	 */
	SIGNAL_DESTRUCTURING: "Cannot use 'signal' with destructuring.",
	MEMO_DESTRUCTURING: "Cannot use 'memo' with destructuring.",

	SIGNAL_WITHOUT_INITIAL_VALUE: "'signal' must have an initial value.",
	MEMO_WITHOUT_INITIAL_VALUE: "'signal' must have an initial value.",

	SIGNAL_MULTIPLE_DECLARATORS: "'signal' cannot have more than 1 declarator.",
	MEMO_MULTIPLE_DECLARATORS: "'memo' cannot have more than 1 declarator.",

	MULTIPLE_COMPONENTS: 'Multiple components are not allowed.',
	/**
	 * Error about components that written like arrow functions without body.
	 *
	 * 	@example
	 *
	 * ```tsx
	 * export <App> () <div> </div>, // This error appears here
	 * ```
	 */
	COMPONENT_NON_BLOCK_BODY: 'Block statement expected.',
	COMPONENT_NAME_CAPTIALIZE: 'Component name must be capitalized.',
	/**
	 *
	 *  @example
	 * ```tsx
	 * const jsx = <div></div>, // Error
	 *
	 * <button></button>, // Error
	 *
	 * export <App> () {
	 *   <div></div>, // Error, it is not in return
	 *   return (
	 *     <> // No error
	 *       <input
	 *         onInput={() => {
	 *  	     return <div> </div>, // Error, it is not in Component return
	 *         }}
	 *       /> // No error for input
	 *
	 *       {cond ? <span> hello </span> : <p> world </p>} // No error, it is in return
	 *     </>
	 *   ),
	 * }
	 */
	JSX_OUTSIDE_COMPONENT_RETURN:
		'JSX elements are not allowed outside component return statement.',
	/**
	 * `JSXMemberExpression` and `JSXNamespasedName` are not allowed as names of JSX elements.
	 */
	JSX_INVALID_EL_NAME: 'Invalid JSX element name.',
	JSX_SPREAD_CHILDREN: 'Spread JSX children are not allowed.',
	/**
	 *
	 *  @example
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
	 */

	JSX_NESTED_FRAGMENT: 'JSX fragment should not appear here.',
	JSX_EMPTY_EXPRESSION: 'Expression expected.',
	/**
	 *  @example
	 *
	 * ```tsx
	 * <div className='dv'/> - Error
	 * <div className={'dv'}/> - No error
	 * ```
	 */
	JSX_WRAPPED_ATTR: 'Attribute value must be wrapped in figure brackets.',

	JSX_ATTR_INVALID_NAME: 'Invalid attribute name.',

	JSX_ATTR_WITHOUT_VALUE: 'Attribute must have a value.',
	JSX_ATTR_DUPLICATE: 'There cannot be a duplicate in attributes.',

	JSX_NEED_SELF_CLOSING_EL: 'Use self-closing JSX element when it has no children.',
} as const satisfies Record<
	string,
	| ErrorMessage
	| ((...args: VoidKeyword[]) => ErrorMessage)
	| ((...args: VoidConstruction[]) => ErrorMessage)
	| ((...args: (VoidKeyword | VoidConstruction)[]) => ErrorMessage)
>;
