import type * as types from '@oxc-project/types';

export const emptyStatement = (): types.EmptyStatement => ({
    type: 'EmptyStatement',
    start: 0,
    end: 0,
    range: undefined,
});

export const identifier = (
    name: string,
    typeAnnotation?: types.TSTypeAnnotation,
): types.IdentifierName => ({
    type: 'Identifier',

    name,
    optional: false,
    decorators: undefined,
    typeAnnotation: typeAnnotation as unknown as null,

    start: 0,
    end: 0,
    range: undefined,
});

export const objectExpression = (
    properties: types.ObjectProperty[],
): types.ObjectExpression => ({
    type: 'ObjectExpression',
    properties,

    start: 0,
    end: 0,
    range: undefined,
});

/**
 * @returns {types.ObjectProperty} {@link types.ObjectProperty} with `kind` - `'init'` and `computed`, `method`, `shorthand` setted to `false`.
 */
export const objectProperty = (
    key: types.IdentifierName,
    value: types.ObjectProperty['value'],
): types.ObjectProperty => ({
    type: 'Property',
    kind: 'init',
    key,

    value,

    computed: false,
    method: false,
    shorthand: false,

    start: 0,
    end: 0,
    range: undefined,
});

export const callExpression = (
    callee: types.CallExpression['callee'],
    args: types.CallExpression['arguments'],
): types.CallExpression => ({
    type: 'CallExpression',
    callee,
    arguments: args,
    optional: false,

    start: 0,
    end: 0,
    range: undefined,
});

export const newExpression = (
    callee: types.NewExpression['callee'],
    args: types.NewExpression['arguments'],
): types.NewExpression => ({
    type: 'NewExpression',
    callee,
    arguments: args,

    start: 0,
    end: 0,
    range: undefined,
});

/**
 * @returns {BinaryExpression | LogicalExpression}  {@link BinaryExpression} or {@link LogicalExpression} depending on provided `type`.
 */

export const binaryExpression = <
    T extends types.BinaryExpression['type'] | types.LogicalExpression['type'],
>(
    type: T,
    operator: T extends types.BinaryExpression['type']
        ? types.BinaryOperator
        : types.LogicalOperator,

    left: types.BinaryExpression['left'],
    right: types.BinaryExpression['right'],
): T extends types.BinaryExpression['type']
    ? types.BinaryExpression
    : types.LogicalExpression =>
    ({
        type,
        operator,
        left,
        right,

        start: 0,
        end: 0,
        range: undefined,
    }) as ReturnType<typeof binaryExpression<T>>; // Assertion is not dangerous, see the signature

export const variableDeclaration = (
    kind: types.VariableDeclaration['kind'],

    declarators: types.VariableDeclarator[],
): types.VariableDeclaration => ({
    type: 'VariableDeclaration',
    kind,
    declarations: declarators,

    start: 0,
    end: 0,
    range: undefined,
});

export const variableDeclarator = (
    identifier: types.VariableDeclarator['id'],
    init: types.VariableDeclarator['init'],
): types.VariableDeclarator => ({
    type: 'VariableDeclarator',
    id: identifier,
    init,

    start: 0,
    end: 0,
    range: undefined,
});

/**
 *
 * Resets `node`'s positions as if it were a new node.
 *
 * It is **DANGEROUS** to use, because it can cause unexpected behaviour if there are strong references on this `node`.
 *
 *
 * Use it only if the `node` is exactly detached from AST and there are not strong references on this node.
 *
 * @param node Node to be reseted.
 *
 * @returns The same `node` with reseted `loc` and `range`.
 */

export const resetNode = <T extends types.Node>(node: T): T => {
    node.start = 0;
    node.end = 0;

    node.range = undefined;

    return node;
};
