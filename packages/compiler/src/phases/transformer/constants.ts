import type {
    ParserOptions,
    LogicalExpression,
    MemberExpression,
} from 'oxc-parser';
import type { DynamicDescription } from './types';

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
 * HTML tag that is used as anchor for dynamic content insertion (for example, components and expressions).
 */
export const ANCHOR_HTML_TAG = '<!---->';

/**
 *
 *
 * Name of property in `HTMLElement.prototype` that refers on the first child of element.
 *
 *
 *
 */

export const FIRST_CHILD_ACCESS = 'firstChild';

/**
 * Name of property in `HTMLElement.prototype` that refers on the next sibling of element.
 */
export const NEXT_SIBLING_ACCESSOR = 'nextSibling';

/**
 *
 * @see {@link Parent}.
 *
 */

export const PARENT_DYNAMIC_DESCRIPTION: DynamicDescription = {
    type: 'Parent',
};

/**
 * Types of identifiers that appear in a traversal `Scope`.
 */
export const scopeIdTypes = { default: 0, signal: 1, computation: 2 } as const;

export const LOGICAL_OPERATORS = {
    '&&': 1,

    '||': 1,

    '??': 1,
} as const satisfies Record<LogicalExpression['operator'], 1>;

/**
 * Key name of `property` in {@link MemberExpression}.
 */

export const MEMBER_EXPRESSION_PROPERTY_KEY =
    'property' satisfies keyof MemberExpression;
