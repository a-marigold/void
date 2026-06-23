import type { ParserOptions, MemberExpression } from 'oxc-parser';

export const oxcParserOptions: ParserOptions = {
	astType: 'ts',

	lang: 'tsx',

	preserveParens: false,

	sourceType: 'module',

	range: false,

	showSemanticErrors: false,
};
/**
 * Type of identifiers that appear in a traversal `Scope`.
 *
 * `Default` variant is falsy.
 *
 */

export const enum ScopeIdType {
	Default,
	Signal,
	Memo,
	PropRef,
	PropElement,
}

/**
 *
 *
 * Key name of `property` in {@link MemberExpression}.
 */
export const MEMBER_EXPRESSION_PROPERTY_KEY = 'property' satisfies keyof MemberExpression;
