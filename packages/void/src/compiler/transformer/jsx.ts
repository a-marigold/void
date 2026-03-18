import * as types from '@babel/types';

import type {
    Identifier,
    MemberExpression,
    JSXElement,
    VariableDeclarator,
} from '@babel/types';

import type { PreprocessResult } from '../preprocessor';

import { generateUniqueIdentifier } from '../preprocessor/utils';

export const generateDomPaths = (
    rootChildren: JSXElement['children'],
    identifiers: PreprocessResult['identifiers'],
    dynamics: Set<JSXElement>,
) => {
    const elements: VariableDeclarator[] = [];

    /**
     *
     * `nodeStack` is flattened for better performance and less allocations.
     *
     * The strict order of `nodeStack`:
     * - The first element must always be {@link JSXElement.children} of a node.
     * - The second element must always be a string with name of parent identifier.
     * @example
     *
     * ```typescript
     * nodeStack.push(
     *   NodeChildren, // Children are needed firstly
     *   ParentIdentifierName, // Name of parent identifier is the second
     * );
     * ```
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

        const chilLength = children?.length;

        let childIndex = 0;
        while (childIndex < chilLength) {
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
                nodeStack.push(
                    childChildren,

                    childName,
                );
            }
            lastSiblingName = childName;
            lastSiblingIndex = childIndex;

            childIndex++;
        }
    }
};

/**
 *
 * #### Generates DOM path from parent to child in babel AST nodes.
 *
 * @param parentName Identifier name of parent element.
 *
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
 *
 * generateChildPath('div', 2);
 *
 *
 *  // Output (if generated via babel gen)
 *
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
 *
 *
 *
 *   <span>2</span>
 * </div>
 *
 * generateSiblingPath('span1', 1);
 * // Output (if generated via babel gen)
 * `span1.nextSibling`;
 *
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
