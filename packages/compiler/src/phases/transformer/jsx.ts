import type {
    Node,
    StringLiteral,
    IdentifierName as Identifier,
    MemberExpression,
    JSXExpression,
    JSXElement,
    JSXIdentifier,
    VariableDeclarator,
    JSXExpressionContainer,
} from 'oxc-parser';

import { traverse } from 'polyast';

import * as nodes from './nodes';
import type {
    TransformContext,
    ErrorContext,
    JSXInfos,
    AttributesInfo,
    JSXParent,
    JSXChild,
} from './types';

import {
    ANCHOR_HTML_TAG,
    FIRST_CHILD_ACCESS,
    NEXT_SIBLING_ACCESSOR,
    JSXExpressionType,
    JSXInfoType,
} from './constants';
import { transformEnterBase, transformExitBase } from './transform';

import { generateUniqueIdentifier } from '../preprocessor/utils';

import type { PreprocessResult } from '../preprocessor';

import type { TraceMap } from '@jridgewell/trace-mapping';

import { compileErrors } from '../../errors';
import type { CompileError } from '../../errors';

import { findInScopes, createNodeCompileError } from './utils';

import { isLowerCase } from '../../utils';

export const transformJsx = (
    root: JSXParent,

    jsxInfos: JSXInfos,
    identifiers: PreprocessResult['identifiers'],
) => {
    const elements: VariableDeclarator[] = [];
    let templateString = '';

    const nodeStack: (JSXChild | number | string)[] = [];
    if (root.type === 'JSXElement') {
        nodeStack.push(root, -1, 0, '_$TEMPLATE', '');
    } else {
        const children = root.children;

        for (let childIndex = 0; childIndex < children.length; childIndex++) {
            nodeStack.push(children[childIndex], -1, 0, '_$TEMPLATE', '');
        }
    }

    let infoIndex = 0;

    while (nodeStack.length) {
        const lastStackIndex = nodeStack.length - 1;

        const siblingName = nodeStack[lastStackIndex] as string;
        const parentName = nodeStack[lastStackIndex - 1] as string;
        const siblingIndex = nodeStack[lastStackIndex - 2] as number;
        const childIndex = nodeStack[lastStackIndex - 3] as number;

        const node = nodeStack[lastStackIndex - 4] as JSXChild;

        let nodeName = '';

        if (childIndex === -1) {
            if (node.type === 'JSXText') {
                templateString += trimJsxText(node.value);
            } else {
                const dynamicInfo = jsxInfos[infoIndex];

                if (dynamicInfo) {
                    if (dynamicInfo === JSXInfoType.Parent) {
                        templateString +=
                            '<' +
                            ((node as JSXElement).openingElement.name as JSXIdentifier).name +
                            '>';
                    } else if (dynamicInfo === JSXInfoType.AttributeElement) {
                        // TODO
                    } else if (dynamicInfo === JSXInfoType.LiteralExpression) {
                        templateString += (
                            (node as JSXExpressionContainer).expression as StringLiteral
                        ).value;
                    } else {
                        templateString += ANCHOR_HTML_TAG;
                    }

                    elements.push(
                        nodes.variableDeclarator(
                            nodes.identifier(nodeName),
                            siblingName
                                ? generateSiblingPath(siblingName, childIndex - siblingIndex)
                                : generateChildPath(parentName, childIndex),
                        ),
                    );

                    nodeName = generateUniqueIdentifier(identifiers, '_$el');

                    nodeStack[lastStackIndex] = nodeName;

                    nodeStack[lastStackIndex - 2] = childIndex;
                }
            }

            infoIndex++;
        }

        const children = (node as JSXElement).children as JSXChild[] | undefined;
        if (children && childIndex < children.length) {
            const newChildIndex = childIndex + 1;

            nodeStack[lastStackIndex - 3] = newChildIndex;

            nodeStack.push(children[newChildIndex], -1, 0, nodeName, '');
        } else {
            if (children) {
                templateString +=
                    '</' + ((node as JSXElement).openingElement.name as JSXIdentifier).name + '>';
            }

            nodeStack.pop();
            nodeStack.pop();
            nodeStack.pop();
            nodeStack.pop();
            nodeStack.pop();
        }
    }
};

// TODO: const enum offsets

/**
 * Used ONLY in {@link analyzeJSX} and {@link markParentsDynamic}.
 *
 * ChildIndex is `-1` when node is node preocessed.
 *
 * @example
 * ```typescript
 * analysisStack.push(
 *   Node,
 *   ChildIndex, // index of current Node children. `-1` when node is not processed
 *   InfoIndex, // start index of Node info in JSXInfos
 * );
 */

type AnalyzeStack = (JSXChild | number)[];

/**
 * Offsets of a node of {@link AnalyzeStack}.
 *
 * @example
 * ```typescript
 * const baseStackOffset = analysisStack.length - AnalysisStackFrame.Size;
 * analysisStack[baseStackOffset + AnalysisStackFrame.Node];
 * analysisStack[baseStackOffset + AnalysisStackFrame.ChildIndex];
 * ```
 */

const enum AnalyzeStackFrame {
    /**
     * Quantity of stack array elements that 1 frame occupies.
     */
    Size = 3,

    Node = 0,
    ChildIndex = 1,
    InfoIndex = 2,
}

/**
 * #### Collects dynamic nodes (nodes that have reactive attributes or reactive JSX expressions) to {@link JSXInfos}.
 * #### Checks all the JSX compile errors.
 * #### Transforms JSX expresions as well as `transform` function does.
 *
 * @param root - Root element of JSX that is to be analyzed.
 * @param traceMap {@link TraceMap}.
 * @param errors Array with {@link CompileError} instances.
 *
 * @returns {JSXInfos} {@link JSXInfos}.
 *
 *
 * @example
 *
 * ```tsx
 * <>
 *   <div> // Dynamic because it contains dynamic node
 *     <span> {count} </span> // Dynamic because it contains reactive expression
 *   </div>
 *   <CountButton count={count} /> // Components are always dynamic nodes
 * </>
 * ```
 *
 *
 *
 *
 *
 */

export const analyzeJsx = (
    root: JSXParent,

    transformContext: TransformContext,
    labels: PreprocessResult['labels'],
    runtimeApiNames: PreprocessResult['runtimeApiNames'],
    errorContext: ErrorContext,
): JSXInfos => {
    const errors = errorContext.errors;

    const jsxInfos: JSXInfos = [];

    /**
     * @see {@link AnalyzeStack}.
     */
    const nodeStack: AnalyzeStack = [];

    if (root.type === 'JSXElement') {
        nodeStack.push(root, -1, 0);
    } else {
        const children = root.children;

        for (let childIndex = 0; childIndex < children.length; childIndex++) {
            nodeStack.push(children[childIndex], -1, childIndex);
        }
    }
    while (nodeStack.length) {
        const baseStackOffset = nodeStack.length - AnalyzeStackFrame.Size;

        const childIndex = nodeStack[baseStackOffset + AnalyzeStackFrame.ChildIndex] as number;
        const node = nodeStack[baseStackOffset + AnalyzeStackFrame.Node] as JSXChild;

        if (childIndex === -1) {
            const nodeType = node.type;

            if (nodeType === 'JSXElement') {
                const openingElement = node.openingElement;

                const tagName = openingElement.name;
                if (tagName.type !== 'JSXIdentifier') {
                    errors.push(
                        createNodeCompileError(
                            errorContext,

                            compileErrors.JSX_INVALID_NAME,

                            tagName.start,
                            tagName.end,
                        ),
                    );

                    jsxInfos.push(JSXInfoType.NoInfo);
                } else if (isLowerCase(tagName.name)) {
                    markParentsDynamic(nodeStack, jsxInfos);

                    jsxInfos.push(JSXInfoType.Component);
                } else {
                    const attributesInfo = analyzeAttributes(
                        openingElement.attributes,
                        transformContext,
                        labels,
                        runtimeApiNames,
                        errorContext,
                    );
                    if (attributesInfo) {
                        markParentsDynamic(nodeStack, jsxInfos);

                        jsxInfos.push(JSXInfoType.AttributeElement, attributesInfo);
                    } else {
                        jsxInfos.push(JSXInfoType.NoInfo);
                    }
                }
            } else if (nodeType === 'JSXExpressionContainer') {
                const expression = node.expression;

                const exprType = analyzeExpression(
                    expression,
                    transformContext,
                    labels,

                    runtimeApiNames,
                    errorContext,
                );

                if (exprType === JSXExpressionType.Empty) {
                    errors.push(
                        createNodeCompileError(
                            errorContext,
                            compileErrors.JSX_EMPTY_EXPRESSION,
                            node.start,
                            node.end,
                        ),
                    );

                    jsxInfos.push(JSXInfoType.NoInfo);
                } else {
                    markParentsDynamic(nodeStack, jsxInfos);

                    jsxInfos.push(exprType as unknown as JSXInfoType);
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

                jsxInfos.push(JSXInfoType.NoInfo);
            } else if (nodeType === 'JSXSpreadChild') {
                errors.push(
                    createNodeCompileError(
                        errorContext,
                        compileErrors.JSX_SPREAD_CHILDREN,
                        node.start,
                        node.end,
                    ),
                );
                jsxInfos.push(JSXInfoType.NoInfo);
            } else {
                jsxInfos.push(JSXInfoType.NoInfo);
            }
        }

        const children = (node as JSXElement).children as JSXChild[] | undefined;

        if (children && childIndex < children.length) {
            const newChildIndex = childIndex + 1;

            nodeStack[baseStackOffset + AnalyzeStackFrame.ChildIndex] = newChildIndex;

            nodeStack.push(children[newChildIndex], -1, jsxInfos.length);
        } else {
            nodeStack.pop();
            nodeStack.pop();
            nodeStack.pop();
        }
    }

    return jsxInfos;
};

/**
 *
 *
 *
 *  #### Makes all parents in `jsxInfos` of current node dynamic.
 * #### Stops when finds a parent that is already in `dynamicNodes` not to reset its dynamic info.
 *
 * @param nodeStack {@link AnalyzeStack} from {@link analyzeJsx} function.
 *
 * @param jsxInfos {@link JSXInfos}.
 *
 */
export const markParentsDynamic = (nodeStack: AnalyzeStack, jsxInfos: JSXInfos): void => {
    let baseStackOffset = nodeStack.length - AnalyzeStackFrame.Size - AnalyzeStackFrame.Size;
    let parentInfoIndex = nodeStack[baseStackOffset + AnalyzeStackFrame.InfoIndex] as number;

    while (baseStackOffset >= 0 && jsxInfos[parentInfoIndex] === JSXInfoType.NoInfo) {
        jsxInfos[parentInfoIndex] = JSXInfoType.Parent;
        baseStackOffset -= AnalyzeStackFrame.Size;

        parentInfoIndex = jsxInfos[
            nodeStack[baseStackOffset + AnalyzeStackFrame.InfoIndex] as number
        ] as number;
    }
};

/**
 * #### Traverses JSX `expression` and returns {@link JSXExpressionType}.
 * #### Transforms nodes inside `expression` via {@link transformEnterBase} and {@link transformExitBase}.
 *
 * @param expression JSX expression to be analyzed.
 * @param transformContext Used in {@link transformEnterBase}.
 * @param labels Used in {@link transformEnterBase}.
 * @param runtimeApiNames Used in {@link transformEnterBase}.
 * @param errorContext Used in {@link transformEnterBase}.
 *
 * @returns {JSXExpressionType} {@link JSXExpressionType} of `expression`.
 */

export const analyzeExpression = (
    expression: JSXExpression,
    transformContext: TransformContext,

    labels: PreprocessResult['labels'],
    runtimeApiNames: PreprocessResult['runtimeApiNames'],
    errorContext: ErrorContext,
): JSXExpressionType => {
    const exprType = expression.type;

    if (exprType === 'Literal') {
        return JSXExpressionType.Literal;
    }
    if (exprType === 'JSXEmptyExpression') {
        return JSXExpressionType.Empty;
    }

    const scopeStack = transformContext.scopeStack;

    let result: JSXExpressionType = JSXExpressionType.Static;

    /**
     * Quantity of visited scopes nested in component.
     *
     * It is `0` when the current scope is component scope.
     */
    let scopeDepth: number = 0;

    traverse<Node>(
        expression,

        (node, parent, key) => {
            const nodeType = node.type;

            if (nodeType === 'BlockStatement') {
                scopeDepth++;
            }

            if (!scopeDepth && nodeType === 'Identifier' && findInScopes(node.name, scopeStack)) {
                result = JSXExpressionType.Reactive;
            }

            return transformEnterBase(
                node,
                parent,
                key,
                transformContext,
                labels,

                runtimeApiNames,
                errorContext,
            );
        },

        (node) => {
            if (node.type === 'BlockStatement') {
                scopeDepth--;
            }

            transformExitBase(node, scopeStack);
        },
    );

    return result;
};

/**
 * #### Analyzes every attribute of JSX element attributes and creates {@link AttributeElementInfo.attributes} from them.
 *
 * @param attributes Attributes of a JSX element.
 * @param transformContext Used in {@link transformEnterBase}.
 * @param labels Used in {@link transformEnterBase}.
 * @param runtimeApiNames Used in {@link transformEnterBase}.
 * @param errorContext Used in {@link transformEnterBase}.
 *
 * @returns {AttributeElementInfo} {@link AttributeElementInfo.attributes} or `null`if there is not any expression in attributes.
 */
export const analyzeAttributes = (
    attributes: JSXElement['openingElement']['attributes'],
    transformContext: TransformContext,
    labels: PreprocessResult['labels'],
    runtimeApiNames: PreprocessResult['runtimeApiNames'],
    errorContext: ErrorContext,
): AttributesInfo | null => {
    const errors = errorContext.errors;

    let attributesInfo: AttributesInfo | null = null;

    for (let attrIndex = 0; attrIndex < attributes.length; attrIndex++) {
        const attribute = attributes[attrIndex];
        const isNamed = attribute.type === 'JSXAttribute';

        const value = isNamed
            ? (attribute.value as JSXExpressionContainer | null)?.expression
            : attribute.argument;
        if (value) {
            const exprType = analyzeExpression(
                value,

                transformContext,
                labels,
                runtimeApiNames,
                errorContext,
            );

            if (exprType === JSXExpressionType.Empty) {
                errors.push(
                    createNodeCompileError(
                        errorContext,

                        compileErrors.JSX_EMPTY_EXPRESSION,

                        value.start,

                        value.end,
                    ),
                );

                continue;
            }

            if (exprType >= JSXExpressionType.Static) {
                attributesInfo = [];
            }

            attributesInfo?.push(exprType, isNamed ? (attribute.name.name as string) : '', value);
        }
    }

    return attributesInfo;
};

/**
 *
 * #### Generates DOM path from parent to child in babel AST nodes.
 *
 *
 * @param parentName Identifier name of parent element. For example, `_$el`.
 * @param childIndex Index of place of the child in parent's children. Starts from `0`.
 *
 * @returns {Identifier | MemberExpression} {@link Identifier} with `parentName` if `elementIndex` is `0`. Otherwise returns `MemberExpression` with path from parent to child.
 *
 * @example
 *
 * ```tsx
 * <div>
 *   <h1> H </h1>
 *
 *   <p> P </p>
 * </div>
 *
 * generateChildPath('div', 2);
 *
 * // Output   (generated)
 *
 * `div.firstChild.nextSibling`; // `<p> </p>`
 * ```
 *
 *
 *
 *
 *
 *
 *
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
 *
 * generateSiblingPath('span1', 1);
 * // Output (if generated via gen)
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
