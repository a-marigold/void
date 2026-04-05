import type {
    ParseResult,
    Expression,
    VariableDeclaration,
    JSXElement,
} from 'oxc-parser';

import type { TraceMap } from '@jridgewell/trace-mapping';

import type { scopeIdTypes } from './constants';

import type { CompileError, LineIndexes } from '../../errors';

/**
 *
 * The result of `transform` function.
 */
export type TransformResult = {
    result: ParseResult;
    errors: CompileError[];
};

/**
 *
 *
 * Object containing all the data to create {@link CompileError}.
 */
export type ErrorContext = {
    readonly errors: CompileError[];

    /**
     * {@link TraceMap} from preprocessed `sourceMap` for correct source positions in errors.
     */
    readonly traceMap: TraceMap;

    /**
     * {@link LineIndexes} from preprocessed `code`.
     */
    readonly lineIndexes: LineIndexes;
};

/**
 *
 * All appeared declarations of signals and computations.
 */
export type Reactives = Set<VariableDeclaration>;

/**
 *
 * Object with description of a dynamic node ({@link AnalyzeJSXResult.dynamicNodes}).
 */
export type DynamicDescription = Parent | StaticExpression | AttributeElement;

type DynamicDescriptionType =
    | 'Parent'
    | 'AttributeElement'
    | 'StaticExpression'
    | 'ReactiveExpression';
type Parent = Readonly<DynamicDescriptionBase<'Parent'>>;

export type AttributeElement = DynamicDescriptionBase<'AttributeElement'> & {
    attributes: Attribute[];
};

type StaticExpression = DynamicDescriptionBase<'StaticExpression'> & {
    expression: Expression;
};
type ReactiveExpression = DynamicDescriptionBase<'ReactiveExpression'> & {
    expression: Expression;
};
type DynamicDescriptionBase<T extends DynamicDescriptionType> = { type: T };

type Attribute = {
    type: 'Static' | 'Reactive';
    /**
     * It is empty if attribute is `JSXSpreadAttribute`.
     */
    name: '' | (string & {});

    value: Expression;
};

/**
 *
 * The result of `analyzeJSXDynamics` function.
 */
export type AnalyzeJSXResult = {
    /**
     * `Map` with description of nodes - `JSXChild` > `DynamicDescription`.
     */

    dynamicNodes: Map<JSXChild, DynamicDescription>;

    /**
     * String to be inserted to `HTMLTemplateElement.prototype.innerHTML` (template of component).
     */

    templateString: string;
};

export type AnalyzeExpressionResult =
    | 'EmptyExpression'
    | 'Literal'
    | 'StaticExpression'
    | 'ReactiveExpression';

/**
 *
 * Derived from {@link JSXElement.children}.
 */
export type JSXChild = JSXElement['children'][number];

export type ClosingHTMLTag = `</${string}>`;

// TODO: add docs

/**
 *
 *
 * `Map` with `idName` > {@link ScopeIdType} of current block or function.
 */

export type Scope = Map<string, ScopeIdType>;

/**
 * Derived from {@link scopeIdTypes}.
 *
 */

export type ScopeIdType = (typeof scopeIdTypes)[keyof typeof scopeIdTypes];
