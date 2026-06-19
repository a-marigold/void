import type * as types from 'oxc-parser';

export const expressionStatement = (expression: types.Expression): types.ExpressionStatement => ({
	type: 'ExpressionStatement',
	expression,
	directive: null,

	start: 0,
	end: 0,
});

export const emptyStatement = (): types.EmptyStatement => ({
	type: 'EmptyStatement',
	start: 0,
	end: 0,
});

export const blockStatement = (body: types.BlockStatement['body']): types.BlockStatement => ({
	type: 'BlockStatement',
	body,
	start: 0,
	end: 0,
});

export const returnStatement = (
	argument: types.ReturnStatement['argument'],
): types.ReturnStatement => ({
	type: 'ReturnStatement',
	argument,
	start: 0,
	end: 0,
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
	}) as T;
export const objectExpression = (
	properties: types.ObjectExpression['properties'],
): types.ObjectExpression => ({
	type: 'ObjectExpression',
	properties,

	start: 0,
	end: 0,
});

/**
 * @returns {types.ObjectProperty} {@link types.ObjectProperty} with `kind: 'init'` and `computed`, `method`, `shorthand` set to `false`.
 */
export const objectProperty = (
	key: types.PropertyKey,

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
});

/**
 * @param body {@link types.ArrowFunctionExpression.params}.
 * @param params {@link types.ArrowFunctionExpression.params};
 *
 * @returns {types.ArrowFunctionExpression} {@link types.ArrowFunctionExpression} with `async`, `generator` set to `false` and `returnType` set to `null`.
 */
export const arrowFunction = (
	body: types.ArrowFunctionExpression['body'],
	params: types.ArrowFunctionExpression['params'],
): types.ArrowFunctionExpression => ({
	type: 'ArrowFunctionExpression',
	body,
	params,

	id: null,
	expression: true,

	async: false,

	generator: false,

	returnType: null,

	start: 0,

	end: 0,
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
});

export const jsxFragment = (children: types.JSXFragment['children']): types.JSXFragment => ({
	type: 'JSXFragment',
	openingFragment: { type: 'JSXOpeningFragment', start: 0, end: 0 },
	children,
	closingFragment: { type: 'JSXClosingFragment', start: 0, end: 0 },
	start: 0,
	end: 0,
});

/**
 *
 * Recursively resets `node`'s and its children positions as if it were a new node.
 *
 * Use it ONLY if the `node` is exactly detached from AST and there are not strong references on this node.
 *
 * @param node Node to be reseted.
 *
 * @returns The same `node` with reseted positions.
 */

export const resetNode = <T extends types.Node>(node: T): T => {
	node.start = 0;
	node.end = 0;

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
