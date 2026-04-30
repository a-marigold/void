import type { Node, ParseResult, JSXElement, JSXExpression } from 'oxc-parser';

import type { TraceMap } from '@jridgewell/trace-mapping';

import type { ScopeIdType, DynamicInfoType, JSXExpressionType } from './constants';

import type { LabelType } from '../preprocessor';

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
 * Object used to connect main `transform` with nested light traversals.
 */
export type TransformContext = {
    /**
     * The last {@link LabelType} appeared in preprocessed code.
     */
    lastLabel: LabelType | '';

    /**
     * Used to identify is there at least one variable declaration to delete the declaration of labels in preprocessed code
     */
    isFirstVarDeclaration: boolean;

    /**
     * Used to identify is there at least one component.
     */
    isComponentAppeared: boolean;
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
 * Object with information about an element of {@link DynamicNodes}
 */
export type DynamicInfo = Parent | AttributeElement;

export type Parent = Readonly<DynamicInfoBase<DynamicInfoType.Parent>>;

/**
 *
 * Element with expressions in attributes.
 */

export type AttributeElement = DynamicInfoBase<DynamicInfoType.AttributeElement> & {
    /**
     * It has a strict order for performance and less memory consumption.
     *  @example
     *
     * ```typescript
     * attributes.push(JSXAttributeType.Reactive, 'class', AttributeValue);
     * ```
     */
    attributes: (JSXExpressionType | string | JSXExpression)[];
};

type DynamicInfoBase<T extends DynamicInfoType> = { type: T };

/**
 * `Map` with information about analyzed JSX nodes.
 */
export type DynamicNodes = Map<JSXChild, DynamicInfo>;

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
 *
 *
 * `Map` with {@link ScopeIdType} of identifier names of current block or function.
 *
 *
 */

export type Scope = Map<string, ScopeIdType>;

/**
 * `WeakSet` with visited reactive identifiers to prevent circular transfomation of them.
 *
 *
 *
 */

export type VisitedReactives = WeakSet<Node>;
