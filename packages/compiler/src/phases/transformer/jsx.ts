import type {
    IdentifierName as Identifier,
    MemberExpression,
    JSXExpression,
    JSXElement,
    JSXFragment,
    VariableDeclarator,
} from 'oxc-parser';

import { traverse } from 'polyast';

import * as nodes from './nodes';
import type {
    ClosingHTMLTag,
    JSXChild,
    AttributeElement,
    AnalyzeJSXResult,
    Scope,
    ErrorContext,
} from './types';

import {
    ANCHOR_HTML_TAG,
    FIRST_CHILD_ACCESS,
    NEXT_SIBLING_ACCESSOR,
    PARENT_DYNAMIC_DESCRIPTION,
    AnalyzedExpressionType,
} from './constants';

import type { PreprocessResult } from '../preprocessor';
import { generateUniqueIdentifier } from '../preprocessor/utils';
import type { TraceMap } from '@jridgewell/trace-mapping';

import { compileErrors } from '../../errors';
import type { CompileError } from '../../errors';

import { findInScopes, createNodeCompileError } from './utils';

import { isLowerCase } from '../../utils';

export const generateDomElements = (
    rootChildren: JSXElement['children'],

    identifiers: PreprocessResult['identifiers'],

    dynamicNodes: AnalyzeJSXResult['dynamicNodes'],
) => {
    const elements: VariableDeclarator[] = [];

    /**
     *
     *
     * `nodeStack` is flattened for better performance and less allocations.
     *
     * @example
     * It has a strict order:
     *
     * ```typescript
     * nodeStack.push(
     *   NodeChildren, // `children` of parent is pushed firstly
     *   ParentIdentifierName, // `parentName` is pushed afterwards
     * );
     * ```
     */

    const nodeStack: (JSXElement['children'] | string)[] = [
        rootChildren,

        '_$el',
    ];

    while (nodeStack.length) {
        // assertions below are not dangerous - see the description of `nodeStack`
        const parentName = nodeStack.pop() as string;
        const children = nodeStack.pop() as JSXElement['children'];

        let lastSiblingName: string = '';
        let lastSiblingIndex: number = 0;

        for (let childIndex = 0; childIndex < children.length; childIndex++) {
            const child = children[childIndex];
            const childType = child.type;

            if (
                (childType === 'JSXElement' && dynamicNodes.has(child)) ||
                childType === 'JSXExpressionContainer'
            ) {
                const childName = generateUniqueIdentifier(identifiers, '_$el');

                elements.push(
                    nodes.variableDeclarator(
                        nodes.identifier(childName),
                        lastSiblingName
                            ? generateSiblingPath(lastSiblingName, childIndex - lastSiblingIndex)
                            : generateChildPath(parentName, childIndex),
                    ),
                );

                const childChildren: JSXElement['children'] | undefined = (
                    children[childIndex] as JSXElement
                ).children;

                if (childChildren) {
                    nodeStack.push(childChildren, childName);
                }

                lastSiblingName = childName;
                lastSiblingIndex = childIndex;
            }
        }
    }
};

/**
 *
 * #### Collects nodes that contain JSX expressions to {@link AnalyzeJSXResult.dynamicNodes}.
 * #### Builds {@link AnalyzeJSXResult.templateString} :
 * #### - Fragments are flattened.
 * #### - JSX expressions and components are converted to HTML comments (`<!---->`).
 *
 *
 *
 * @param root - Root element of JSX that is to be analyzed.
 * @param traceMap {@link TraceMap}.
 * @param errors Array with {@link CompileError} instances.
 *
 * @returns {AnalyzeJSXResult} {@link AnalyzeJSXResult}.
 *
 *
 * @example
 *
 * ```tsx
 * <>
 *   <div>
 *     <span> {count} </span>
 *   </div>
 *
 *   <CountButton count={count} />
 * </>
 * ```
 *
 * Template will be:
 *
 * ```typescript
 * `<div><span> <!----> </span></div><!---->`
 * ```
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */

export const analyzeJsx = (root: JSXElement | JSXFragment, errorContext: ErrorContext) => {
    const errors = errorContext.errors;

    const parents = new Map<JSXChild, JSXElement>();

    const nodeStack: JSXChild[] = [];
    if (root.type === 'JSXElement') {
        nodeStack.push(root);
    } else {
        const children = root.children;
        for (let childIndex = 0; childIndex < children.length; childIndex++) {
            nodeStack.push(children[childIndex]);
        }
    }

    while (nodeStack.length) {
        const node = nodeStack.pop() as JSXChild;

        const nodeType = node.type;

        if (nodeType === 'JSXElement') {
            const children = node.children;
            for (let childIndex = 0; childIndex < children.length; childIndex++) {
                const child = children[childIndex];

                nodeStack.push(child);
            }
        }

        if (nodeType === 'JSXExpressionContainer') {
            node.expression;
        }
        if (nodeType === 'JSXFragment') {
            errors.push(
                createNodeCompileError(
                    errorContext,
                    compileErrors.JSX_NESTED_FRAGMENT,
                    node.start,
                    node.end,
                ),
            );

            continue;
        }

        if (nodeType === 'JSXSpreadChild') {
            errors.push(
                createNodeCompileError(
                    errorContext,
                    compileErrors.JSX_SPREAD_CHILDREN,
                    node.start,
                    node.end,
                ),
            );

            continue;
        }
    }
};

/**
 *
 * #### Traverses JSX `expression` and returns {@link AnalyzedExpressionType}.
 *
 * @param expression JSX expression to be analyzed.
 * @param scopeStack Stack of scopes from main traversal to identify reactive identifiers.
 *
 * @returns {AnalyzedExpressionType} {@link AnalyzedExpressionType} of `expression`.
 *
 *
 *
 *
 *
 */
export const analyzeExpression = (
    expression: JSXExpression,
    scopeStack: Scope[],
): AnalyzedExpressionType => {
    if (expression.type === 'Literal') {
        return AnalyzedExpressionType.Literal;
    }
    if (expression.type === 'JSXEmptyExpression') {
        return AnalyzedExpressionType.Empty;
    }

    let result: AnalyzedExpressionType = AnalyzedExpressionType.Static;

    /**
     * Quantity of visited scopes nested in component.
     * It is `0` when the current scope is component scope.
     */

    let scopeDepth: number = 0;

    traverse(
        expression,

        (node) => {
            const nodeType = node.type;

            if (nodeType === 'ArrowFunctionExpression' || nodeType === 'FunctionExpression') {
                scopeDepth++;
            }

            if (!scopeDepth && nodeType === 'Identifier' && findInScopes(node.name, scopeStack)) {
                result = AnalyzedExpressionType.Dynamic;
            }
        },

        (node) => {
            if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
                scopeDepth++;
            }
        },
    );

    return result;
};

/**
 * #### Generates DOM path from parent to child in babel AST nodes.
 *
 * @param parentName Identifier name of parent element. For example, `_$el`.
 * @param childIndex Index of place of child in parent children. Starts from `0`.
 *
 * @returns {Identifier | MemberExpression} {@link Identifier} with `parentName` if `elementIndex` is `0`. Otherwise returns `MemberExpression` with path from parent to child.
 *
 * @example
 *
 * ```tsx
 * <div>
 *   <h1> H </h1>
 *   <p> P </p>
 * </div>
 *
 * generateChildPath('div', 2);
 * // Output (if generated via babel gen)
 * `div.firstChild.nextSibling`; // `<p> </p>`
 * ```
 */
export const generateChildPath = (
    parentName: string,
    childIndex: number,
): Identifier | MemberExpression => {
    let elementPath: Identifier | MemberExpression = nodes.memberExpression(
        nodes.identifier(parentName),
        nodes.identifier(FIRST_CHILD_ACCESS),
    );

    for (let pathIndex = 0; pathIndex < childIndex; pathIndex++) {
        elementPath = nodes.memberExpression(elementPath, nodes.identifier(NEXT_SIBLING_ACCESSOR));
    }

    return elementPath;
};

/**
 * #### Generates DOM path from anchor to sibling in babel AST nodes.
 *
 * @param anchorName Identifier name of anchor element from which path is started. For example, `_$siblingEl`.
 * @param siblingIndex Distance to the sibling (`sibglingChildIndex - anchorChildIndex`) in DOM. Starts from `0`.
 *
 * @returns {Identifier | MemberExpression} {@link Identifier} with `anchorName` if the `siblingIndex` is `0`. Otherwise returns {@link MemberExpression} with DOM path from anchor to sibling.
 *
 *
 * @example
 *
 * ```tsx
 * <div>
 *   <span>1</span>
 *
 *   <span>2</span>
 * </div>
 * generateSiblingPath('span1', 1);
 * // Output (if generated via babel gen)
 * `span1.nextSibling`;
 * ```
 *
 *
 */
export const generateSiblingPath = (
    anchorName: string,

    siblingIndex: number,
): Identifier | MemberExpression => {
    let sibling: Identifier | MemberExpression = nodes.identifier(anchorName);

    for (let pathIndex = 0; pathIndex < siblingIndex; pathIndex++) {
        sibling = nodes.memberExpression(sibling, nodes.identifier('nextSibling'));
    }

    return sibling;
};

/**
 *
 *
 * #### Climbs up all the parents of `node` and adds them to `dynamicNodes` with {@link PARENT_DYNAMIC_DESCRIPTION}.
 *
 * #### Stops when finds a parent that is already in `dynamicNodes` not to reset its description.
 *
 *
 *
 *
 *
 *
 * @param node JSX node, parents of which to be marked.
 * @param parents `WeakMap` with all the parents (`JSXChild` > `JSXParent`) appeared before the `node`.
 * @param dynamicNodes {@link AnalyzeJSXResult.dynamicNodes}.
 *
 *
 *
 */

export const markParentsDynamic = (
    node: JSXChild,
    parents: WeakMap<JSXChild, JSXElement>,
    dynamicNodes: AnalyzeJSXResult['dynamicNodes'],
): void => {
    let currentParent = parents.get(node);
    while (currentParent && !dynamicNodes.has(currentParent)) {
        dynamicNodes.set(currentParent, PARENT_DYNAMIC_DESCRIPTION);
        currentParent = parents.get(currentParent);
    }
};

/**
 *
 * #### If the left or right side of `text` (before content) has line feed, trims this side of `text`.
 *
 * @param text JSX text to be trimmed.
 *
 * @returns Trimmed with JSX rules string.
 *
 * @example
 *
 * ```typescript
 * trimJsxText('  \n   abc      '); // 'abc      '
 * trimJsxText('      abc      \n'); // '      abc'
 * trimJsxTex('\n   abc   \n'); // 'abc'
 *
 * trimJsxText('   abc   '); // '   abc   '
 * trimJsxText('   \t   '); // '   \t   '
 * trimJsxText('   \n   '); // ''
 * ```
 */
export const trimJsxText = (text: string): string => {
    const textLength = text.length;

    let hasNewLineStart: boolean = false;

    // TODO: add length bound check
    let startPos = 0;
    let startChar = text[startPos];
    while (startChar === ' ' || startChar === '\n' || startChar === '\r' || startChar === '\t') {
        if (startChar === '\n') {
            hasNewLineStart = true;
        }

        startPos++;
        startChar = text[startPos];
    }

    if (startPos === textLength) {
        return hasNewLineStart ? '' : text;
    }

    let hasNewLineEnd = false;

    let endPos = textLength - 1;
    let endChar = text[endPos];

    while (endChar === ' ' || endChar === '\n' || endChar === '\r' || endChar === '\t') {
        if (endChar === '\n') {
            hasNewLineEnd = true;
        }

        endPos--;
        endChar = text[endPos];
    }

    return text.slice(hasNewLineStart ? startPos : 0, hasNewLineEnd ? endPos + 1 : textLength);
};
