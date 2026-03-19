import type { ParseResult } from '@babel/parser';
import type { Node, JSXElement } from '@babel/types';

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
     * `Set` with nodes that are dynamic, that is they should be updated in effects.
     */
    dynamicNodes: Set<JSXElement>;
    /**
     *
     * String to be inserted to `HTMLTemplateElement.prototype.innerHTML` (template of component).
     */
    templateString: string;
};

/**
 * Derived from {@link JSXElement.children} babel type.
 */

export type JSXChild = JSXElement['children'][number];
export type ClosingHTMLTag = `</${string}>`;
