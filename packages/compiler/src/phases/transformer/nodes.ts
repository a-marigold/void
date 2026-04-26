import type * as typess from 'oxc-parser';

export const emptyStatement = (): typess.EmptyStatement => ({
    type: 'EmptyStatement',

    start: 0,
    end: 0,
    range: undefined,
});

export const identifier = (
    name: string,
    typeAnnotation?: typess.TSTypeAnnotation,
): typess.IdentifierName => ({
    type: 'Identifier',
    name,
    optional: false,
    decorators: undefined,
    typeAnnotation: typeAnnotation as unknown as null,

    start: 0,
    end: 0,
    range: undefined,
});

export const literal = <
    T extends
        | typess.NumericLiteral
        | typess.StringLiteral
        | typess.BooleanLiteral
        | typess.NullLiteral,
>(
    value: T['value'],
): T =>
    ({
        type: 'Literal',
        value,
        raw: '',
        start: 0,
        end: 0,

        range: undefined,
    }) as T;

export const objectExpression = (properties: typess.ObjectProperty[]): typess.ObjectExpression => ({
    type: 'ObjectExpression',
    properties,

    start: 0,
    end: 0,
    range: undefined,
});

/**
 * @returns {typess.ObjectProperty} {@link typess.ObjectProperty} with `kind: 'init'` and `computed`, `method`, `shorthand` set to `false`.
 */
export const objectProperty = (
    key: typess.IdentifierName,

    value: typess.ObjectProperty['value'],
): typess.ObjectProperty => ({
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

/**
 * @returns {typess.MemberExpression} {@link typess.MemberExpression} with `optional`, `computed` set to `false`.
 */

export const memberExpression = (
    object: typess.StaticMemberExpression['object'],
    property: typess.StaticMemberExpression['property'],
): typess.StaticMemberExpression => ({
    type: 'MemberExpression',

    object,
    property,
    optional: false,

    computed: false,

    start: 0,
    end: 0,
    range: undefined,
});

export const callExpression = (
    callee: typess.CallExpression['callee'],
    args: typess.CallExpression['arguments'],
    typeArguments: typess.CallExpression['typeArguments'],
): typess.CallExpression => ({
    type: 'CallExpression',
    callee,
    arguments: args,
    optional: false,
    typeArguments,

    start: 0,
    end: 0,
    range: undefined,
});

export const newExpression = (
    callee: typess.NewExpression['callee'],
    args: typess.NewExpression['arguments'],
): typess.NewExpression => ({
    type: 'NewExpression',

    callee,

    arguments: args,
    start: 0,
    end: 0,
    range: undefined,
});

/**
 *
 * @param type `BinaryExpression` or `LogicalExpression`.
 *
 * @returns {BinaryExpression | LogicalExpression}  {@link BinaryExpression} or {@link LogicalExpression} depending on provided `type`.
 */

export const binaryExpression = <
    T extends typess.BinaryExpression['type'] | typess.LogicalExpression['type'],
>(
    type: T,
    operator: T extends typess.BinaryExpression['type']
        ? typess.BinaryOperator
        : typess.LogicalOperator,

    left: typess.BinaryExpression['left'],
    right: typess.BinaryExpression['right'],
): T extends typess.BinaryExpression['type'] ? typess.BinaryExpression : typess.LogicalExpression =>
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
    kind: typess.VariableDeclaration['kind'],

    declarators: typess.VariableDeclarator[],
): typess.VariableDeclaration => ({
    type: 'VariableDeclaration',
    kind,
    declarations: declarators,

    start: 0,
    end: 0,

    range: undefined,
});
export const variableDeclarator = (
    identifier: typess.VariableDeclarator['id'],
    init: typess.VariableDeclarator['init'],
): typess.VariableDeclarator => ({
    type: 'VariableDeclarator',
    id: identifier,
    init,

    start: 0,
    end: 0,

    range: undefined,
});

export const tsTypeAnnotation = (
    annotation: typess.TSTypeAnnotation['typeAnnotation'],
): typess.TSTypeAnnotation => ({
    type: 'TSTypeAnnotation',

    typeAnnotation: annotation,

    start: 0,
    end: 0,
    range: undefined,
});
export const tsTypeReference = (
    typeName: typess.TSTypeReference['typeName'],
    typeArguments: typess.TSTypeReference['typeArguments'] | null,
): typess.TSTypeReference => ({
    type: 'TSTypeReference',
    typeName,
    typeArguments,

    start: 0,
    end: 0,
    range: undefined,
});

export const tsTypeParameterInstatiation = (
    params: typess.TSTypeParameterInstantiation['params'],
): typess.TSTypeParameterInstantiation => ({
    type: 'TSTypeParameterInstantiation',
    params,
    start: 0,
    end: 0,
    range: undefined,
});

/**
 * Recursively resets `node`'s and its children positions as if it were a new node.
 *
 * It is DANGEROUS to use, because it can cause unexpected behaviour if there are strong references on this `node`.
 *
 * Use it only if the `node` is exactly detached from AST and there are not strong references on this node.
 *
 * @param node Node to be reseted.
 *
 *
 * @returns The same `node` with reseted positions.
 */

export const resetNode = <T extends typess.Node>(node: T): T => {
    node.start = 0;
    node.end = 0;

    node.range = undefined;

    for (const key in node) {
        const property = node[key];

        if (typeof property === 'object') {
            if ((property as typess.Node | null)?.type) {
                resetNode(property as typess.Node);
            }

            if (Array.isArray(property) && typeof property[0] === 'object') {
                let elIndex = 0;

                while (elIndex < property.length) {
                    resetNode(property[elIndex]);
                    elIndex++;
                }
            }
        }
    }
    return node;
};
