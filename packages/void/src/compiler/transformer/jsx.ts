import type { JSXElement } from '@babel/types';

/**
 *
 *
 * Used for monomorphism of {@link walkJSXPaths} function, when there is not children in a JSX element.
 */
const NO_CHILDREN: readonly [] = [];

/**
 *
 * #### Starting from children of a root element, walks all the JSX tree and transforms JSX to dom API calls.
 *
 *
 *
 * @param rootChildren {@link JSXElement.children} of root element.
 *
 */
export const walkJSXPaths = (
    rootChildren: JSXElement['children'] | typeof NO_CHILDREN,
    path: number[] = [], // TODO: here
): void => {
    const rootChildrenLength = rootChildren.length;

    let childIndex = 0;

    while (childIndex < rootChildrenLength) {
        const child = rootChildren[childIndex];

        path[path.length] = childIndex;

        walkJSXPaths('children' in child ? child.children : NO_CHILDREN, path);

        path.pop();

        childIndex++;
    }
};
