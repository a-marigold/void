import type { ParserOptions, LogicalExpression, MemberExpression } from 'oxc-parser';

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
    Default = 0,
    Signal,
    Memo,
}

/**
 * All the operators of {@link LogicalExpression}.
 */
export const LOGICAL_OPERATORS = {
    '&&': true,
    '||': true,
    '??': true,
} as const satisfies Record<LogicalExpression['operator'], true>;

/**
 * Key name of `property` in {@link MemberExpression}.
 */
export const MEMBER_EXPRESSION_PROPERTY_KEY = 'property' satisfies keyof MemberExpression;
