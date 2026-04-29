import type { ParserOptions, LogicalExpression, MemberExpression } from 'oxc-parser';

import type { Parent } from './types';

export const oxcParserOptions: ParserOptions = {
    astType: 'ts',
    lang: 'tsx',
    preserveParens: false,

    sourceType: 'module',

    range: false,

    showSemanticErrors: false,
};
/**
 *
 * Types of identifiers that appear in a traversal `Scope`.
 *
 * `Default` variant is falsy.
 *
 */

export const enum ScopeIdType {
    Default = 0,
    Signal = 1,
    Memo = 2,
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

/**
 * Type of analyzed JSX expression.
 *
 * Values are in ascending order from most static to most dynamic and reactive.
 *
 *
 */
export const enum JSXExpressionType {
    Literal = 0,

    /**
     * `JSXEmptyExpression`.
     */
    Empty = 1,

    /**
     *
     * Static expression NOT depended on reactive identifiers (an identifier or expression like `16 + 16`) .
     */
    Static = 2,

    /**
     * Expression depended on reactive identifiers inside.
     */
    Reactive = 3,
}

/**
 *
 * Type of information of dynamic nodes.
 */
export const enum DynamicInfoType {
    /**
     * Static parent with dynamic children.
     *
     *
     */
    Parent = 0,

    /**
     *
     * Static JSX expression with no reactive identifiers inside.
     */
    StaticExpression = 1,

    /**
     *
     * Element with expressions in attributes.
     */
    AttributeElement = 2,
}
/**
 *
 *
 * {@link Parent}.
 */

export const PARENT_DYNAMIC_DESCRIPTION: Parent = {
    type: DynamicInfoType.Parent,
};
/**
 * HTML tag that is used as anchor for dynamic content insertion (for example, components and expressions).
 */
export const ANCHOR_HTML_TAG = '<!---->';

/**
 *
 * Name of property in `HTMLElement.prototype` that refers on the first child of element.
 *
 *
 */

export const FIRST_CHILD_ACCESS = 'firstChild';

/**
 * Name of property in `HTMLElement.prototype` that refers on the next sibling of element.
 */
export const NEXT_SIBLING_ACCESSOR = 'nextSibling';
