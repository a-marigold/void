import type { Node, ParseResult, JSXElement, JSXExpression } from 'oxc-parser';

import type { TraceMap } from '@jridgewell/trace-mapping';

import type { ScopeIdType, JSXAttributeType, DynamicDescriptionType } from './constants';

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
 * Object with description of {@link AnalyzeJSXResult.dynamicNodes}.
 */
export type DynamicDescription = Parent | AttributeElement;

export type Parent = Readonly<DynamicDescriptionBase<DynamicDescriptionType.Parent>>;

export type AttributeElement = DynamicDescriptionBase<DynamicDescriptionType.AttributeElement> & {
    /**
     *
     *  @example
     *
     * ```typescript
     * // The strict order of an element
     * attributes.push(JSXAttributeType.Reactive, 'class', AttributeValue);
     * ```
     */

    attributes: (JSXAttributeType | string | JSXExpression)[];
};

type DynamicDescriptionBase<T extends DynamicDescriptionType> = { type: T };

/**
 *
 * The result of `analyzeJsx` function.
 */
export type AnalyzeJSXResult = {
    /**
     * `Map` with description of nodes - `JSXChild` > `DynamicDescription`.
     */

    dynamicNodes: Map<JSXChild, DynamicDescription>;
};

/**
 *
 * Derived from {@link JSXElement.children}.
 *
 *
 */
export type JSXChild = JSXElement['children'][number];

export type ClosingHTMLTag = `</${string}>`;

// TODO: add docs

/**
 *
 * `Map` with `idName` > {@link ScopeIdType} of current block or function.
 */

export type Scope = Map<string, ScopeIdType>;

/**
 * `WeakSet` with visited reactive identifiers to prevent circular transfomation of them.
 *
 */

export type VisitedReactives = WeakSet<Node>;
