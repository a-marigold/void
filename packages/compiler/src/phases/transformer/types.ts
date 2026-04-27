import type { Node, ParseResult, Expression, JSXElement } from 'oxc-parser';

import type { TraceMap } from '@jridgewell/trace-mapping';

import type { ScopeIdType } from './constants';

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
 *
 * `Map` with `idName` > {@link ScopeIdType} of current block or function.
 */

export type Scope = Map<string, ScopeIdType>;

/**
 *
 * `WeakSet` with visited reactive identifiers to prevent circular transfomation of them.
 */

export type VisitedReactives = WeakSet<Node>;
