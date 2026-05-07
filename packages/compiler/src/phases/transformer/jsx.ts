import type {
    Node,
    StringLiteral,
    IdentifierName as Identifier,
    Expression,
    MemberExpression,
    JSXExpression,
    JSXElement,
    JSXAttribute,
    JSXIdentifier,
    CallExpression,
    VariableDeclarator,
    JSXExpressionContainer,
    AssignmentExpression,
} from 'oxc-parser';
import { traverse } from 'polyast';
import * as nodes from './nodes';

import type {
    TransformContext,
    ErrorContext,
    TransformJSXResult,
    JSXInfos,
    AttributesInfo,
    JSXParent,
    JSXChild,
} from './types';

import {
    ANCHOR_HTML_TAG,
    FIRST_CHILD_ACCESS,
    NEXT_SIBLING_ACCESSOR,
    JSXExprType,
    JSXInfoType,
    AttributeInfo,
    SPEC_ATTR_NAMES,
} from './constants';
import { transformEnterBase, transformExitBase } from './transform';

import { generateUniqueIdentifier } from '../preprocessor/utils';

import type { PreprocessResult } from '../preprocessor';

import type { TraceMap } from '@jridgewell/trace-mapping';

import { compileErrors } from '../../errors';
import type { CompileError } from '../../errors';

import { createEffectCall, findInScopes, createNodeCompileError } from './utils';

import { isLowerCase } from '../../utils';

export const transformJsx = (
    root: JSXParent,

    jsxInfos: JSXInfos,
    identifiers: PreprocessResult['identifiers'],
    runtimeApiNames: PreprocessResult['runtimeApiNames'],
): TransformJSXResult => {
    const elements: VariableDeclarator[] = [];

    const transformJsxResult: TransformJSXResult = {
        templateString: '',
        generatedDom: [nodes.variableDeclaration('const', elements)],
    };

    /**
     *
     *
     *  @example
     * ```typescript
     * nodeStack.push(
     *   Node,
     *   ChildIndex, // index of current processed child of Node
     *   ParentIdName, // name of Node parent Identifier
     *   SiblingIdName, // name of Node sibling identifier
     *   SiblingIndex, // index of Node sibling
     * );
     */
    const nodeStack: (JSXChild | number | string)[] = [];
    if (root.type === 'JSXElement') {
        nodeStack.push(root, -1, '_$TEMPLATE', '', 0);
    } else {
        const children = root.children;

        for (let childIndex = 0; childIndex < children.length; childIndex++) {
            nodeStack.push(children[childIndex], -1, '_$TEMPLATE', '', 0);
        }
    }

    /**
     *  @example
     * ```typescript
     * const baseStackOffset = nodeStack.length - NodeStackFrame.Size;
     * const node = nodeStack[baseStackOffset + NodeStackFrame.Node];
     * const childIndex = nodeStack[baseStackOffset + NodeStackFrame.ChildIndex];
     * ```
     */

    const enum NodeStackFrame {
        /**
         * Quantity of elements one stack frame occupies.
         */
        Node,
        ChildIndex,
        ParentIdName,
        SiblingIdName,
        SiblingIndex,
        Size = 5,
    }

    /**
     *
     * Start index in {@link jsxInfos} of current processed node.
     */
    let infoIndex = 0;

    while (nodeStack.length) {
        const baseStackOffset = nodeStack.length - NodeStackFrame.Size;
        const node = nodeStack[baseStackOffset + NodeStackFrame.Node] as JSXChild;
        const childIndex = nodeStack[baseStackOffset + NodeStackFrame.ChildIndex] as number;
        const siblingIndex = nodeStack[baseStackOffset + NodeStackFrame.SiblingIndex] as number;
        const parentIdName = nodeStack[baseStackOffset + NodeStackFrame.ParentIdName] as string;
        const siblingIdName = nodeStack[baseStackOffset + NodeStackFrame.SiblingIdName] as string;

        let nodeIdName = '';

        if (childIndex === -1) {
            if (node.type === 'JSXText') {
                transformJsxResult.templateString += trimJsxText(node.value);
            } else {
                const dynamicInfo = jsxInfos[infoIndex];

                if (dynamicInfo) {
                    elements.push(
                        nodes.variableDeclarator(
                            nodes.identifier(nodeIdName),
                            siblingIdName
                                ? generateSiblingPath(siblingIdName, childIndex - siblingIndex)
                                : generateChildPath(parentIdName, childIndex),
                        ),
                    );

                    nodeIdName = generateUniqueIdentifier(identifiers, '_$el');

                    nodeStack[baseStackOffset + NodeStackFrame.SiblingIdName] = nodeIdName;

                    nodeStack[baseStackOffset + NodeStackFrame.SiblingIndex] =
                        nodeStack[
                            baseStackOffset - NodeStackFrame.Size + NodeStackFrame.ChildIndex
                        ];

                    if (dynamicInfo === JSXInfoType.Parent) {
                        transformJsxResult.templateString +=
                            '<' +
                            ((node as JSXElement).openingElement.name as JSXIdentifier).name +
                            ' ' +
                            generateLiteralAttributes(
                                (node as JSXElement).openingElement.attributes,
                            ) +
                            '>';
                    } else if (dynamicInfo === JSXInfoType.AttributeElement) {
                        infoIndex++;

                        transformAttributes(
                            jsxInfos[infoIndex] as AttributesInfo,
                            nodeIdName,
                            transformJsxResult,
                            runtimeApiNames,
                        );
                    } else if (dynamicInfo === JSXInfoType.LiteralExpression) {
                        transformJsxResult.templateString += (
                            (node as JSXExpressionContainer).expression as StringLiteral
                        ).value;
                    } else {
                        transformJsxResult.templateString += ANCHOR_HTML_TAG;
                    }
                }
            }

            infoIndex++;
        }

        // TODO: remove to top

        const children = (node as JSXElement).children as JSXChild[] | undefined;

        if (children && childIndex < children.length) {
            const newChildIndex = childIndex + 1;

            nodeStack[NodeStackFrame.ChildIndex] = newChildIndex;

            nodeStack.push(children[newChildIndex], -1, 0, nodeIdName, '');
        } else {
            if (children) {
                transformJsxResult.templateString +=
                    '</' + ((node as JSXElement).openingElement.name as JSXIdentifier).name + '>';
            }

            nodeStack.pop();

            nodeStack.pop();
            nodeStack.pop();
            nodeStack.pop();
            nodeStack.pop();
        }
    }

    return transformJsxResult;
};

/**
 * #### Generates DOM operations and template string for `attributesInfo` and adds them to .
 *
 * @param attributesInfo {@link AttributesInfo} to generate from.
 * @param nodeIdName Name of identifier of node having `attributesInfo`.
 * @param transformJsxResult {@link TransformJsxResult} to be mutated with generated attributes.
 *
 *
 *
 * @param runtimeApiNames   {@link PreprocessResult.runtimeApiNames}.
 */

export const transformAttributes = (
    attributesInfo: AttributesInfo,
    nodeIdName: string,
    transformJsxResult: TransformJSXResult,
    runtimeApiNames: PreprocessResult['runtimeApiNames'],
): void => {
    const generatedDom = transformJsxResult.generatedDom;

    transformJsxResult.templateString += ' '; // a space not to break prev content
    for (let attrIndex = 0; attrIndex < attributesInfo.length; attrIndex += AttributeInfo.Size) {
        const exprType = attributesInfo[attrIndex + AttributeInfo.ExprType] as JSXExprType;
        const name = attributesInfo[attrIndex + AttributeInfo.Name] as string;
        const value = attributesInfo[attrIndex + AttributeInfo.Value] as Expression;

        if (!name) {
            // name absence means `JSXSpreadAttribute`
            generatedDom.push(
                nodes.expressionStatement(
                    createMergeAttrsCall(
                        runtimeApiNames.mergeAttrs,
                        nodeIdName,

                        nodes.resetNode(value),
                    ),
                ),
            );
        } else if (exprType === JSXExprType.Literal) {
            transformJsxResult.templateString += name + '="' + (value as StringLiteral).value + '"';
        } else if (exprType === JSXExprType.Static) {
            generatedDom.push(
                nodes.expressionStatement(
                    createAttrUpdate(nodeIdName, name, nodes.resetNode(value)),
                ),
            );
        } else if (exprType === JSXExprType.Reactive) {
            generatedDom.push(
                nodes.expressionStatement(
                    createEffectCall(
                        runtimeApiNames.createEffect,
                        nodes.arrowFunction(
                            createAttrUpdate(nodeIdName, name, nodes.resetNode(value)),
                        ),
                    ),
                ),
            );
        }
    }
};
/**
 *
 * #### Generates  HTML string  from  `attributes`.
 *
 * @param attributess Attributes ONLY with literals, for which {@link analyzeAttributes} returned `null`.
 *
 * @returns Generated HTML string. Attributes are without spaces aside (that is `'class='value'`).
 */
export const generateLiteralAttributes = (
    attributess: JSXElement['openingElement']['attributes'],
): string => {
    let generated: string = '';
    for (let attrIndex = 0; attrIndex < attributess.length; attrIndex++) {
        /**
         * The attributes are always literals with names
         * because of {@link analyzeAttributes}  function.
         *
         *
         */
        const attribute = attributess[attrIndex] as JSXAttribute;

        generated += attribute.name.name + '="' + (attribute.value as StringLiteral).value + '"';
    }

    return generated;
};

/**
 * Used ONLY in {@link analyzeJSX} and {@link markParentsDynamic}.
 *
 *
 * @example
 *
 * ```typescript
 * analyzeStack.push(
 *   Node,
 *   ChildIndex, // index of current processed Node child. `-1` when node is not processed
 *   InfoIndex, // start index of Node info in JSXInfos
 * );
 */

type AnalyzeStack = (JSXChild | number)[];

/**
 * @example
 *
 * ```typescript
 * const baseStackOffset = analysisStack.length - AnalysisStackFrame.Size;
 * analyzeStack[baseStackOffset + AnalysisStackFrame.Node];
 *  analyzeStack[baseStackOffset + AnalysisStackFrame.ChildIndex];
 * ```
 */
const enum AnalyzeStackFrame {
    Node,

    ChildIndex,

    InfoIndex,

    /**
     * Quantity of stack array elements that 1 frame occupies.
     */
    Size = 3,
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
 *
 * @returns {JSXInfos} {@link JSXInfos}.
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

                if (exprType === JSXExprType.Empty) {
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
 * #### Traverses JSX `expression` and returns {@link JSXExprType}.
 * #### Transforms nodes inside `expression` via {@link transformEnterBase} and {@link transformExitBase}.
 *
 * @param expression JSX expression to be analyzed.
 * @param transformContext Used in {@link transformEnterBase}.
 * @param labels Used in {@link transformEnterBase}.
 * @param runtimeApiNames Used in {@link transformEnterBase}.
 * @param errorContext Used in {@link transformEnterBase}.
 *
 * @returns {JSXExprType} {@link JSXExprType} of `expression`.
 */

export const analyzeExpression = (
    expression: JSXExpression,
    transformContext: TransformContext,

    labels: PreprocessResult['labels'],
    runtimeApiNames: PreprocessResult['runtimeApiNames'],
    errorContext: ErrorContext,
): JSXExprType => {
    const exprType = expression.type;

    if (exprType === 'Literal') {
        return JSXExprType.Literal;
    }
    if (exprType === 'JSXEmptyExpression') {
        return JSXExprType.Empty;
    }

    const scopeStack = transformContext.scopeStack;

    let result: JSXExprType = JSXExprType.Static;

    const componentScope = transformContext.componentScope;

    traverse<Node>(
        expression,

        (node, parent, key) => {
            if (
                node.type === 'Identifier' &&
                scopeStack[scopeStack.length - 1] === componentScope &&
                findInScopes(node.name, scopeStack)
            ) {
                result = JSXExprType.Reactive;
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
            transformExitBase(node, scopeStack);
        },
    );

    return result;
};

/**
 * #### Analyzes every attribute of JSX element attributes and creates {@link AttributeElementInfo.attributes} from them.
 * #### Attributes are considered dynamic if at least one attribute is `JSXSpreadAttribute`, `JSXEmptyExpression` or `Expression`.
 *
 * @param attributes Attributes of a JSX element.
 * @param transformContext Used in {@link transformEnterBase}.
 * @param labels Used in {@link transformEnterBase}.
 * @param runtimeApiNames Used in {@link transformEnterBase}.
 * @param errorContext Used in {@link transformEnterBase}.
 *
 *
 * @returns {AttributeElementInfo} {@link AttributeElementInfo.attributes} or `null` attributes are only literals.
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

        // TODO: JSXSpreadAttribute is always dynamic

        const value = isNamed
            ? ((attribute.value as JSXExpressionContainer | null)?.expression as Expression)
            : attribute.argument;

        if (value) {
            const exprType = analyzeExpression(
                value,
                transformContext,
                labels,
                runtimeApiNames,
                errorContext,
            );

            if (exprType === JSXExprType.Empty) {
                errors.push(
                    createNodeCompileError(
                        errorContext,
                        compileErrors.JSX_EMPTY_EXPRESSION,
                        value.start,
                        value.end,
                    ),
                );

                attributesInfo ||= [];

                continue;
            }

            if (exprType >= JSXExprType.Static || !isNamed) {
                attributesInfo ||= [];
            }

            attributesInfo?.push(exprType, isNamed ? (attribute.name.name as string) : '', value);
        }
        // TODO: else error
    }

    return attributesInfo;
};

/**
 * @param mergeAttrsName Name of `mergeAttrs` from {@link PreprocessResult.runtimeApiNames}.
 * @param elIdName Name of identifier of `element` paramater from `mergeAttrs`.
 *
 * @param attributes `attributes` parameter from `mergeAttrs`.
 *
 * @returns `mergeAttrs` runtime function call.
 */
const createMergeAttrsCall = (
    mergeAttrsName: string,
    elIdName: string,
    attributes: Expression,
): CallExpression =>
    nodes.callExpression(
        nodes.identifier(mergeAttrsName),

        [nodes.identifier(elIdName), attributes],

        null,
    );

/**
 * @param elIdName Name of element identifier.
 * @param attrName Name of element attribute.
 * @param value Value to be assigned.
 *
 * @returns Assignment of `value` to element attribute.
 */
const createAttrUpdate = (
    elIdName: string,
    attrName: string,
    value: Expression,
): AssignmentExpression =>
    nodes.assignmentExpression(
        '=',
        nodes.memberExpression(nodes.identifier(elIdName), nodes.identifier(attrName)),
        value,
    );

/**
 * #### Generates DOM path from parent to child in AST nodes.
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
 * `div.firstChild.nextSibling`; // `<p> </p>`
 * ```
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
 * #### Generates DOM path from anchor to sibling in AST nodes.
 *
 * @param anchorName Identifier name of anchor element from which path is started. For example, `_$siblingEl`.
 * @param siblingIndex Distance to the sibling (`sibglingChildIndex - anchorChildIndex`) in DOM. Starts from `0`.
 *
 * @returns {Identifier | MemberExpression} {@link Identifier} with `anchorName` if the `siblingIndex` is `0`. Otherwise returns {@link MemberExpression} with DOM path from anchor to sibling.
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
