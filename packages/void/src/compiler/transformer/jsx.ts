import * as types from '@babel/types';
import type {
    Identifier,
    MemberExpression,
    JSXElement,
    VariableDeclaration,
    VariableDeclarator,
} from '@babel/types';

import type { PreprocessResult } from '../preprocessor';

import { generateUniqueIdentifier } from '../preprocessor/utils';

/**
 *
 *
 * Used for monomorphism of {@link walkJSXPaths} function, when there is not children in a JSX element.
 */
const NO_CHILDREN: readonly [] = [];

/**
 *
 * #### Generates DOM path to child from root in babel AST nodes.
 *
 *
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
 *
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
