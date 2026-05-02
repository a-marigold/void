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
    /**
     * `JSXEmptyExpression`.
     */
    Empty,

    Literal,
    /**
     * Static expression NOT depended on reactive identifiers (an identifier or expression like `16 + 16`) .
     */
    Static,
    /**
     * Expression depended on reactive identifiers insides.
     */
    Reactive,
}

/**
 * Type of information of JSX nodes.
 *
 * `LiteralExpression`, `StaticExpression`, `ReactiveExpression` are the same with `Literal`, `Static`, `Reactive` from {@link JSXExpressionType}.
 */
export const enum JSXInfoType {
    /**
     * Node with error or `JSXText`.
     */
    NoInfo,

    LiteralExpression = JSXExpressionType.Literal,
    /**
     *  Static JSX expression without reactive identifiers inside.
     */

    StaticExpression = JSXExpressionType.Static,
    ReactiveExpression = JSXExpressionType.Reactive,

    /**
     * Static parent with dynamic children.
     */
    Parent,

    /**
     *
     * Element with expressions in attributes.
     */

    AttributeElement,

    Component,
}

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
