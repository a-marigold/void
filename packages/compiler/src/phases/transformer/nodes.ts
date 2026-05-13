import type * as types from 'oxc-parser';

export const expressionStatement = (expression: types.Expression): types.ExpressionStatement => ({
	type: 'ExpressionStatement',
	expression,
	directive: null,

	start: 0,
	end: 0,
	range: undefined,
});
export const emptyStatement = (): types.EmptyStatement => ({
	type: 'EmptyStatement',

	start: 0,
	end: 0,
	range: undefined,
});

export const blockStatement = (body: types.BlockStatement['body']): types.BlockStatement => ({
	type: 'BlockStatement',
	body,
	start: 0,
	end: 0,
	range: undefined,
});

export const returnStatement = (
	argument: types.ReturnStatement['argument'],
): types.ReturnStatement => ({
	type: 'ReturnStatement',
	argument,
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

export const literal = <
	T extends
		| types.NumericLiteral
		| types.StringLiteral
		| types.BooleanLiteral
		| types.NullLiteral,
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

export const objectExpression = (properties: types.ObjectProperty[]): types.ObjectExpression => ({
	type: 'ObjectExpression',
	properties,

	start: 0,
	end: 0,

	range: undefined,
});

/**
 * @returns {types.ObjectProperty} {@link types.ObjectProperty} with `kind: 'init'` and `computed`, `method`, `shorthand` set to `false`.
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

/**
 * @returns {types.MemberExpression} {@link types.MemberExpression} with `optional`, `computed` set to `false`.
 */

export const memberExpression = (
	object: types.StaticMemberExpression['object'],
	property: types.StaticMemberExpression['property'],
): types.StaticMemberExpression => ({
	type: 'MemberExpression',

	object,
	property,
	optional: false,

	computed: false,

	start: 0,
	end: 0,
	range: undefined,
});

/**
 *
 *
 *
 * @param body Body of a {@link types.BlockStatement}. This means this node builder returns only arrows with blocks.
 *
 * @returns {types.ArrowFunctionExpression} {@link types.ArrowFunctionExpression} with `async`, `generator` set to `false` and `returnType` set to `null`.
 */
export const arrowFunction = (
	returnValue: types.ArrowFunctionExpression['body'],
): types.ArrowFunctionExpression => ({
	type: 'ArrowFunctionExpression',
	body: returnValue,
	params: [],

	id: null,
	expression: true,
	async: false,
	generator: false,

	returnType: null,

	start: 0,
	end: 0,

	range: undefined,
});

export const callExpression = (
	callee: types.CallExpression['callee'],
	args: types.CallExpression['arguments'],
	typeArguments: types.CallExpression['typeArguments'],
): types.CallExpression => ({
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
 *
 * @param type `BinaryExpression` or `LogicalExpression`.
 *
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
): T extends types.BinaryExpression['type'] ? types.BinaryExpression : types.LogicalExpression =>
	({
		type,
		operator,
		left,
		right,

		start: 0,
		end: 0,
		range: undefined,
	}) as ReturnType<typeof binaryExpression<T>>; // Assertion is not dangerous, see the signature

export const assignmentExpression = (
	operator: types.AssignmentExpression['operator'],
	left: types.AssignmentExpression['left'],
	right: types.AssignmentExpression['right'],
): types.AssignmentExpression => ({
	type: 'AssignmentExpression',
	operator,
	left,
	right,

	start: 0,
	end: 0,
	range: undefined,
});

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

export const tsTypeAnnotation = (
	annotation: types.TSTypeAnnotation['typeAnnotation'],
): types.TSTypeAnnotation => ({
	type: 'TSTypeAnnotation',

	typeAnnotation: annotation,

	start: 0,
	end: 0,
	range: undefined,
});
export const tsTypeReference = (
	typeName: types.TSTypeReference['typeName'],
	typeArguments: types.TSTypeReference['typeArguments'] | null,
): types.TSTypeReference => ({
	type: 'TSTypeReference',
	typeName,
	typeArguments,

	start: 0,
	end: 0,
	range: undefined,
});

export const tsTypeParameterInstatiation = (
	params: types.TSTypeParameterInstantiation['params'],
): types.TSTypeParameterInstantiation => ({
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

export const resetNode = <T extends types.Node>(node: T): T => {
	node.start = 0;
	node.end = 0;

	node.range = undefined;

	for (const key in node) {
		const property = node[key];

		if (typeof property === 'object') {
			if ((property as types.Node | null)?.type) {
				resetNode(property as types.Node);
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
