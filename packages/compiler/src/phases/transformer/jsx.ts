import type {
    IdentifierName as Identifier,
    MemberExpression,
    JSXExpression,
    JSXElement,
    JSXFragment,
    VariableDeclarator,
    JSXExpressionContainer,
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
    JSXExpressionType,
    JSXAttributeType,
    DynamicDescriptionType,
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
     *  @example
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
 * Used ONLY in {@link analyzeJSX} and {@link markParentsDynamic}.
 */
type AnalyzeNodeStack = (JSXChild | number)[];

/**
 *
 * #### Collects dynamic nodes (nodes that have reactive attributes or reactive JSX expressions) to {@link AnalyzeJSXResult}.
 * #### Checks all the JSX compile errors.
 *
 * #### Transforms JSX expresions as well as `transform` function does.
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
 *   <div> // Dynamic because it contains dynamic node
 *     <span> {count} </span> // Dynamic because it contains reactive expression.
 *   </div>
 *
 *   <CountButton count={count} /> // Components are always dynamic nodes
 * </>
 * ```
 *
 *
 */

export const analyzeJsx = (
    root: JSXElement | JSXFragment,
    scopeStack: Scope[],
    errorContext: ErrorContext,
): AnalyzeJSXResult => {
    const errors = errorContext.errors;

    /**
     *
     * Contains couples parent nodes and the current index of theirs children.
     *  @example
     * ```typescript
     * nodeStack.push(
     *   Node, // node
     *   -1, // `-1` means the node is not proccessed
     * );
     * ```
     */

    const nodeStack: AnalyzeNodeStack = [];

    if (root.type === 'JSXElement') {
        nodeStack.push(root, -1);
    } else {
        const children = root.children;

        for (let childIndex = 0; childIndex < children.length; childIndex++) {
            nodeStack.push(children[childIndex], -1);
        }
    }

    const dynamicNodes: AnalyzeJSXResult['dynamicNodes'] = new Map();

    while (nodeStack.length) {
        /**
         *
         *
         * Index of `nodeStack` array referring to`childIndex` of the last element.
         */
        const stackLastIndex = nodeStack.length - 1;

        const childIndex = nodeStack[stackLastIndex] as number;

        const node = nodeStack[stackLastIndex - 1] as JSXChild;

        if (childIndex === -1) {
            const nodeType = node.type;

            if (nodeType === 'JSXElement') {
                const openingElement = node.openingElement;

                if (openingElement.name.type !== 'JSXIdentifier') {
                    errors.push(
                        createNodeCompileError(
                            errorContext,
                            compileErrors.JSX_MEMBER_EXPRESSION,
                            node.start,
                            node.end,
                        ),
                    );
                } else {
                    const attributes = analyzeAttributes(openingElement.attributes, scopeStack);

                    if (attributes) {
                        dynamicNodes.set(node, {
                            type: DynamicDescriptionType.AttributeElement,
                            attributes,
                        });

                        markParentsDynamic(nodeStack, dynamicNodes);
                    }
                }
            } else if (nodeType === 'JSXExpressionContainer') {
                const exprType = analyzeExpression(node.expression, scopeStack);

                if (exprType === JSXExpressionType.Empty) {
                    errors.push(
                        createNodeCompileError(
                            errorContext,
                            compileErrors.JSX_EMPTY_EXPRESSION,

                            node.start,
                            node.end,
                        ),
                    );

                    nodeStack.pop();
                    nodeStack.pop();
                }
                if (exprType === JSXExpressionType.Reactive) {
                    markParentsDynamic(nodeStack, dynamicNodes);
                }
            } else if (nodeType === 'JSXFragment') {
                errors.push(
                    createNodeCompileError(
                        errorContext,
                        compileErrors.JSX_NESTED_FRAGMENT,

                        node.start,

                        node.end,
                    ),
                );
            } else if (nodeType === 'JSXSpreadChild') {
                errors.push(
                    createNodeCompileError(
                        errorContext,
                        compileErrors.JSX_SPREAD_CHILDREN,

                        node.start,
                        node.end,
                    ),
                );
            }
        }

        const children = (node as JSXElement).children as JSXChild[] | undefined;

        if (children && childIndex < children.length) {
            const newChildIndex = childIndex + 1;
            nodeStack[stackLastIndex] = newChildIndex;

            nodeStack.push(children[newChildIndex], -1);
        } else {
            nodeStack.pop();
            nodeStack.pop();
        }
    }
    return { dynamicNodes };
};

/**
 *
 *
 * #### Climbs up all the parents of `node` and adds them to `dynamicNodes` with {@link PARENT_DYNAMIC_DESCRIPTION}.
 *
 * #### Stops when finds a parent that is already in `dynamicNodes` not to reset its description.
 *
 * @param nodeStack {@link AnalyzeNodeStack} from {@link analyzeJsx} function.
 * @param dynamicNodes {@link AnalyzeJSXResult.dynamicNodes}.
 *
 *
 *
 */

export const markParentsDynamic = (
    nodeStack: AnalyzeNodeStack,
    dynamicNodes: AnalyzeJSXResult['dynamicNodes'],
): void => {
    let parentIndex = nodeStack.length - 3;
    let parent: JSXChild = nodeStack[parentIndex] as JSXChild;

    while (parentIndex >= 0 && !dynamicNodes.has(parent)) {
        dynamicNodes.set(parent, PARENT_DYNAMIC_DESCRIPTION);
        parentIndex -= 2;
        parent = nodeStack[parentIndex] as JSXChild;
    }
};

/**
 * #### Traverses JSX `expression` and returns {@link JSXExpressionType}.
 *
 * @param expression JSX expression to be analyzed.
 * @param scopeStack Stack of scopes from main `transform`.
 *
 *
 * @returns {JSXExpressionType} {@link JSXExpressionType} of `expression`.
 *
 *
 *
 */
export const analyzeExpression = (
    expression: JSXExpression,
    scopeStack: Scope[],
): JSXExpressionType => {
    if (expression.type === 'Literal') {
        return JSXExpressionType.Literal;
    }
    if (expression.type === 'JSXEmptyExpression') {
        return JSXExpressionType.Empty;
    }

    let result: JSXExpressionType = JSXExpressionType.Static;

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
                result = JSXExpressionType.Reactive;
            }
        },

        (node) => {
            if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
                scopeDepth--;
            }
        },
    );

    return result;
};

/**
 *
 * #### Analyzes every attribute of a JSX element and creates {@link AttributeElement.attributes} from them.
 *
 * @param attributes Attributes of a JSX element.
 * @param scopeStack Stack of {@link Scope} from main `transform`.
 *
 * @returns {AttributeElement} {@link AttributeElement.attributes} or `null` if there is not any expression in attributes.
 */
export const analyzeAttributes = (
    attributes: JSXElement['openingElement']['attributes'],
    scopeStack: Scope[],
): AttributeElement['attributes'] | null => {
    let dynamicAttributes: AttributeElement['attributes'] | null = null;

    for (let attrIndex = 0; attrIndex < attributes.length; attrIndex++) {
        const attribute = attributes[attrIndex];
        const isNamed = attribute.type === 'JSXAttribute';

        const value = isNamed
            ? (attribute.value as JSXExpressionContainer | null)?.expression
            : attribute.argument;

        if (value) {
            const exprType = analyzeExpression(value, scopeStack);
            // TODO: complicate
            if (exprType >= JSXExpressionType.Static) {
                if (dynamicAttributes) {
                    dynamicAttributes.push(
                        exprType === JSXExpressionType.Static
                            ? JSXAttributeType.Static
                            : JSXAttributeType.Reactive,
                        isNamed ? (attribute.name.name as string) : '',
                        value,
                    );
                } else {
                    dynamicAttributes = [];
                }
            }
        }
    }

    return dynamicAttributes;
};

/**
 * #### Generates DOM path from parent to child in babel AST nodes.
 *
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
 * #### If the left or right side of `text` (before content) has line feed, trims this side of `text`.
 *
 * @param text JSX text to be trimmed.
 *
 * @returns Trimmed with JSX rules string.
 *
 * @example
 *
 *
 *
 *
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
 *
 *
 *
 *
 *
 *
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
