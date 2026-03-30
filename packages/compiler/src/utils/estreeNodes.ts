import type {
    Node,
    EmptyStatement,
    VariableDeclarator,
    VariableDeclaration,
    Identifier,
    SimpleLiteral,
    ObjectExpression,
    Property,
    SimpleCallExpression,
    NewExpression,
    BinaryExpression,
    LogicalExpression,
    BinaryOperator,
    LogicalOperator,
} from 'estree';

export const emptyStatement = (): EmptyStatement => ({
    type: 'EmptyStatement',

    loc: null,

    range: undefined,

    trailingComments: undefined,
    leadingComments: undefined,
});

export const identifier = (name: string): Identifier => ({
    type: 'Identifier',
    name,
    loc: null,

    range: undefined,

    trailingComments: undefined,
    leadingComments: undefined,
});

export const literal = (value: SimpleLiteral['value']): SimpleLiteral => ({
    type: 'Literal',
    value,
    raw: '',

    loc: null,
    range: undefined,
    trailingComments: undefined,
    leadingComments: undefined,
});

export const objectExpression = (properties: Property[]): ObjectExpression => ({
    type: 'ObjectExpression',

    properties,
    loc: null,
    range: undefined,

    trailingComments: undefined,
    leadingComments: undefined,
});

/**
 *
 * `computed`, `method`, `shorthand` properties of {@link Property} are set to `false`.
 */

export const property = (
    key: Identifier,
    value: Property['value'],
): Property => ({
    type: 'Property',
    key,
    value,
    kind: 'init',

    computed: false,
    method: false,
    shorthand: false,

    loc: null,

    range: undefined,

    trailingComments: undefined,
    leadingComments: undefined,
});

export const callExpression = (
    callee: SimpleCallExpression['callee'],

    args: SimpleCallExpression['arguments'],
): SimpleCallExpression => ({
    type: 'CallExpression',
    callee,
    arguments: args,
    optional: false,
    loc: null,
    range: undefined,
    trailingComments: undefined,
    leadingComments: undefined,
});

export const newExpression = (
    callee: SimpleCallExpression['callee'],
    args: SimpleCallExpression['arguments'],
): NewExpression => ({
    type: 'NewExpression',
    callee,
    arguments: args,
    loc: null,
    range: undefined,
    trailingComments: undefined,
    leadingComments: undefined,
});

/**
 * @returns {BinaryExpression | LogicalExpression}  {@link BinaryExpression} or {@link LogicalExpression} depending on provided `type`.
 */

export const binaryExpression = <
    T extends BinaryExpression['type'] | LogicalExpression['type'],
>(
    type: T,
    operator: T extends BinaryExpression['type']
        ? BinaryOperator
        : LogicalOperator,

    left: BinaryExpression['left'],
    right: BinaryExpression['right'],
): T extends BinaryExpression['type'] ? BinaryExpression : LogicalExpression =>
    ({
        type,
        operator,
        left,
        right,

        loc: null,
        range: undefined,

        trailingComments: undefined,

        leadingComments: undefined,
    }) as T extends BinaryExpression['type']
        ? BinaryExpression
        : LogicalExpression; // Assertion is not dangerous, see the signature

export const variableDeclaration = (
    kind: VariableDeclaration['kind'],

    declarators: VariableDeclarator[],
): VariableDeclaration => ({
    type: 'VariableDeclaration',

    kind,
    declarations: declarators,
    loc: null,

    range: undefined,
    trailingComments: undefined,

    leadingComments: undefined,
});

export const variableDeclarator = (
    identifier: VariableDeclarator['id'],
    init: VariableDeclarator['init'],
): VariableDeclarator => ({
    type: 'VariableDeclarator',

    id: identifier,

    init,

    loc: null,

    range: undefined,

    trailingComments: undefined,

    leadingComments: undefined,
});

/**
 *
 * Resets `node`'s location as if it were a new node.
 *
 * It is **DANGEROUS** to use, because it can cause unexpected behaviour if there are strong references on this `node`.
 *
 *
 * Use it only if the `node` is exactly separated from AST and there are not strong references on this node.
 *
 * @param node Node to be reseted.
 *
 * @returns The same `node` with reseted `loc` and `range`.
 *
 */

export const resetNode = <T extends Node>(node: T): T => {
    node.loc = null;

    node.range = undefined;

    return node;
};
