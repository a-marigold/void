import type { VoidKeyword, VoidConstruction } from '../types';

/**
 * Object with messages of errors that appear while `void-js` file is compiling.
 */
export const compileErrors = {
	/**
	 * @param keyword Keyword, identifier after which is expected.
	 */

	IDENTIFIER_EXPECTED: (keyword: VoidKeyword | VoidConstruction) =>
		"Identifier of '" + keyword + "' expected.",

	/**
	 *
	 * @param tokenValue Value of token (for example, `(` or `=`) that is expected.
	 */

	TOKEN_EXPECTED: (tokenValue: string) => "'" + tokenValue + "' expected.",

	/**
	 *
	 * An error about variable declaration with `void-js` keyword as name.
	 *
	 * @param keyword Keyword that was used as variable declaration name.
	 *
	 */

	KEYWORD_AS_VARIABLE_NAME: (keyword: VoidKeyword | (string & {})) =>
		"'" +
		keyword +
		"' is a 'void-js' keyword and is not allowed as variable declaration name.",

	/**
	 *
	 *
	 * An error about `signal` or `memo` used with destructuring.
	 *
	 * @param keyword Keyword that was used with destructuring.
	 *
	 *
	 */

	REACTIVE_DESTRUCTURING: (keyword: VoidKeyword) =>
		"Cannot use '" + keyword + "' with destructuring.",

	REACTIVE_WITHOUT_INITIAL_VALUE: (keyword: VoidKeyword) =>
		"'" + keyword + "' identifier must have an initial value.",

	MULTIPLE_COMPONENTS: 'Multiple components are not allowed.',

	/**
	 * An error about components that written like arrow functions without body.
	 *
	 * @example
	 *
	 * ```tsx
	 * export <App> () <div> </div>; // This error appears here
	 * ```
	 */
	COMPONENT_NON_BLOCK_BODY: 'Block statement expected.',
	COMPONENT_NAME_CAPTIALIZE: 'Component name must be capitalized.',

	JSX_OUTSIDE_COMPONENT: 'JSX elements are not allowed outside a component return statement.',
	JSX_INVALID_EL_NAME: 'Invalid JSX element name.',
	JSX_SPREAD_CHILDREN: 'Spread children are not allowed.',
	/**
	 *
	 *  @example
	 * ```tsx
	 * <> - This fragment is OK because it is the root
	 *   <div>
	 *     <>  - Error appears here, because the fragment is not needed
	 *       <span> Hello </span>
	 *     </>
	 *   </div>
	 *
	 *   <> </> - Error, because this fragment is also not needed
	 * </>
	 *
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
	JSX_WRAPPED_ATTR: 'Attribute value must be wrapped in container.',
	JSX_ATTR_WITHOUT_VALUE: 'Attribute must have a value.',
	JSX_REF_INVALID_VALUE: "Value of 'ref' can only be an identifier.",
} as const;
