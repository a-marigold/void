import * as types from '@babel/types';

import type {
    Identifier,
    MemberExpression,
    JSXElement,
    JSXFragment,
    VariableDeclarator,
    SourceLocation,
} from '@babel/types';

import type { ClosingHTMLTag, JSXChild, AnalyzeJSXResult } from './types';
import type { PreprocessResult } from '../preprocessor';

import { generateUniqueIdentifier } from '../preprocessor/utils';
import type { TraceMap } from '@jridgewell/trace-mapping';

import { compileErrors } from '../errors';
import type { CompileError } from '../errors';
import { createCompileErrorFromNode } from './utils';

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
     *
     * It has a strict order:
     *
     * ```typescript
     * nodeStack.push(
     *   NodeChildren, // `children` is pushed firstly
     *   ParentIdentifierName, // `parentName` is pushed afterwards
     * );
     * ```
     *
     *
     *
     *
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

        const chilLength = children.length;

        let childIndex = 0;
        while (childIndex < chilLength) {
            const child = children[childIndex];
            const childType = child.type;

            if (
                childType === 'JSXElement' ||
                childType === 'JSXExpressionContainer'
            ) {
                const childName = generateUniqueIdentifier(identifiers, '_$el');

                elements.push(
                    types.variableDeclarator(
                        types.identifier(childName),
                        lastSiblingName
                            ? generateSiblingPath(
                                  lastSiblingName,
                                  childIndex - lastSiblingIndex,
                              )
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

            childIndex++;
        }
    }
};

/**
 *
 *
 * #### Collects nodes that contain JSX expressions to {@link AnalyzeJSXResult.dynamicNodes}.
 * #### Builds {@link AnalyzeJSXResult.templateString}:
 * - Fragments are flattened.
 * - JSX expressions are converted to HTML comments (`<!---->`).
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
 * </>
 * ```
 *
 * Template will be:
 *
 * ```typescript
 * `<div> <span> <!----> </span> </div>`
 * ```
 *
 */
export const analyzeJsx = (
    root: JSXElement | JSXFragment,
    traceMap: TraceMap,
    errors: CompileError[],
): AnalyzeJSXResult => {
    const dynamicNodes: AnalyzeJSXResult['dynamicNodes'] = new Set();

    let templateString: AnalyzeJSXResult['templateString'] = '';

    /**
     * `nodeStack` is flattened for better performance and less allocations.
     *
     * @example
     * It has a strict order.
     *
     * ```typescript
     * // If a child with its parent are needed
     * nodeStack.push(
     *   ParentNode || null, // Parent is pushed earlier. It is `null` for the root
     *   Node, // Child node is always after Parent
     * );
     *
     * // If a closing tag is needed
     * nodeStack.push(`</div>`); // It will be added to `AnalyzeJSXResult.template` and skipped
     * ```
     */
    const nodeStack: (null | JSXChild | ClosingHTMLTag)[] = [];

    if (root.type === 'JSXElement') {
        nodeStack.push(null, root);
    } else {
        // fragment flattening

        const rootChildren = root.children;

        const rootChildrenLength = root.children.length;

        let rootIndex = 0;

        while (rootIndex < rootChildrenLength) {
            nodeStack.push(null, rootChildren[rootIndex]);
        }
    }
    while (nodeStack.length) {
        /**
         *
         *
         * It can be a closing tag or a `JSXChild` node.
         */
        const node = nodeStack.pop() as JSXChild | ClosingHTMLTag;

        if (typeof node === 'string') {
            templateString += node;

            continue;
        }
        const parent = nodeStack.pop() as JSXElement | null;

        const nodeType = node.type;

        if (nodeType === 'JSXFragment') {
            const fragmentLoc = node.loc as SourceLocation;

            errors.push(
                createCompileErrorFromNode(
                    traceMap,
                    compileErrors.JSX_NESTED_FRAGMENT,
                    fragmentLoc.start,
                    fragmentLoc.end,
                ),
            );

            continue;
        }

        if (node.type === 'JSXElement') {
            const openingElement = node.openingElement;

            const nodeTag = openingElement.name;
            if (nodeTag.type !== 'JSXIdentifier') {
                const nodeTagLoc = nodeTag.loc as SourceLocation;
                errors.push(
                    createCompileErrorFromNode(
                        traceMap,
                        compileErrors.JSX_MEMBER_EXPRESSION,
                        nodeTagLoc.start,
                        nodeTagLoc.end,
                    ),
                );

                continue;
            }
            const attributes = openingElement.attributes;
            const attributesLength = attributes.length;

            let attrIndex = 0;
            while (attrIndex < attributesLength) {}

            const tag = nodeTag.name;

            templateString += '<' + tag + '>';

            nodeStack.push(('</' + tag + '>') as ClosingHTMLTag);

            const children = node.children;
            let childIndex = children.length - 1;
            while (childIndex >= 0) {
                nodeStack.push(node, children[childIndex]);

                childIndex--;
            }
            continue;
        }

        if (node.type === 'JSXText') {
            templateString += node.value;

            continue;
        }

        if (node.type === 'JSXExpressionContainer') {
            templateString += '<!>';

            let currentParent = parent;

            while (currentParent && !dynamicNodes.has(currentParent)) {
                dynamicNodes.add(currentParent);
            }

            continue;
        }

        if (node.type === 'JSXSpreadChild') {
            const spreadLoc = node.loc as SourceLocation;

            errors.push(
                createCompileErrorFromNode(
                    traceMap,
                    compileErrors.JSX_SPREAD_CHILDREN,
                    spreadLoc.start,
                    spreadLoc.end,
                ),
            );

            continue;
        }
    }

    return { dynamicNodes, templateString };
};

/**
 *
 * #### Generates DOM path from parent to child in babel AST nodes.
 *
 *
 *
 * @param parentName Identifier name of parent element.
 * @param elementIndex Index of place of child in parent children.
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
    elementIndex: number,
): Identifier | MemberExpression => {
    let elementPath: Identifier | MemberExpression = types.memberExpression(
        types.identifier(parentName),

        types.identifier('firstChild'),
    );
    let pathIndex = 0;
    while (pathIndex < elementIndex) {
        elementPath = types.memberExpression(
            elementPath,
            types.identifier('nextSibling'),
        );

        pathIndex++;
    }

    return elementPath;
};

/**
 * #### Generates DOM path from anchor to sibling in babel AST nodes.
 *
 * @param anchorName Identifier name of anchor element from which path is started.
 * @param siblingIndex Index of place of sibling in DOM.
 *
 * @returns {Identifier | MemberExpression} {@link Identifier} with `anchorName` if the `siblingIndex` is `0`. Otherwise returns {@link MemberExpression} with DOM path from anchor to sibling.
 *
 * @example
 *
 * ```tsx
 * <div>
 *   <span>1</span>
 *   <span>2</span>
 * </div>
 *
 * generateSiblingPath('span1', 1);
 * // Output (if generated via babel gen)
 * `span1.nextSibling`;
 * ```
 *
 */
export const generateSiblingPath = (
    anchorName: string,
    siblingIndex: number,
): Identifier | MemberExpression => {
    let sibling: Identifier | MemberExpression = types.identifier(anchorName);

    let pathIndex = 0;
    while (pathIndex < siblingIndex) {
        sibling = types.memberExpression(
            sibling,
            types.identifier('nextSibling'),
        );
    }

    return sibling;
};
