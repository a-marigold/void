import type { ParseResult } from '@babel/parser';
import type { Node, JSXElement, JSXFragment } from '@babel/types';

import type { CompileError } from '../errors';

export type BabelNodePosition =
    | NonNullable<Node['loc']>['start']
    | NonNullable<Node['loc']>['end'];

/**
 *
 * The result of `transform` function.
 *
 */

export type TransformResult = {
    ast: ParseResult;
    errors: CompileError[];
};

/**
 *
 * The result of `analyzeJSXDynamics` function.
 */
export type AnalyzeJSXResult = {
    /**
     *
     * `Set` with JSX elements (not Text and Expressions) that contain JSX expressions, event handlers or expressions in attributes.
     *
     * @example
     *
     * ```tsx
     * signal count = 10;
     *
     * <div> - DYNAMIC because of `count` and handlers inside
     *   <span> {count} </span> - DYNAMIC because of `count` inside
     *   <button onClick={() => { count++; }}> + </button> - DYNAMIC because of dynamic attribute
     *   <span> </span> - NOT DYNAMIC
     * </div>
     * ```
     */
    dynamicNodes: Set<JSXElement>;

    /**
     * String to be inserted to `HTMLTemplateElement.prototype.innerHTML` (template of component).
     */
    templateString: string;
};

/**
 * Derived from {@link JSXElement.children} babel type.
 */

export type JSXChild = JSXElement['children'][number];

export type ClosingHTMLTag = `</${string}>`;
