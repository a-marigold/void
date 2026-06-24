import type {
	ArrowFunctionExpression,
	Expression,
	CallExpression,
	VariableDeclaration,
	AssignmentExpression,
} from 'oxc-parser';

import type { PreprocessResult, UniqueId } from '../../preprocessor';
import * as nodes from '../nodes';
import { createEffectInit } from '../utils';

import { TEXT_NODE_DATA_KEY_NAME } from './constants';
import type { ComponentChildren, ComponentProps } from './types';

/**
 * @param expr Expression for first argument of `insert`.
 * @param anchorIdName Name of identifier `anchor` argument of `insert`.
 * @param insertName `insert` of {@link PreprocessResult.runtimeApiNames}.
 *
 * @returns Call of `insert` - `insert(expr, anchorIdName, prevExprNode)`.
 */
export const createInsertCall = (
	expr: Expression,
	anchorIdName: UniqueId,
	insertName: UniqueId,
): CallExpression =>
	nodes.callExpression(
		nodes.identifier(insertName),
		[expr, nodes.identifier(anchorIdName)],
		null,
	);

/**
 * @param initNodeIdName Name of identifier to be used in initialization.
 * @param expr Init expression to be insterted.
 * @param anchorIdName For {@link createInsertCall}.
 * @param insertName For {@link createInsertCall}.
 *
 * @returns `const (initNodeIdName) = insert(expr, (anchorIdName));`.
 */
export const createReactiveExprInit = (
	initNodeIdName: UniqueId,
	expr: Expression,
	anchorIdName: UniqueId,
	insertName: UniqueId,
): VariableDeclaration =>
	nodes.variableDeclaration('const', [
		nodes.variableDeclarator(
			nodes.identifier(initNodeIdName),

			createInsertCall(expr, anchorIdName, insertName),
		),
	]);

/**
 *
 * @param expr Expression to be inserted.
 * @param initNodeIdName Name of identifier used in {@link createReactiveExprInit} for this expression.
 * @param createEffectName Name of `createEffect` runtime function.
 *
 * @returns Effect init with reusing prev node via updating its data ({@link createTextNodeReuse}).
 */
export const createReactiveInsertCall = (
	expr: Expression,
	initNodeIdName: UniqueId,
	createEffectName: UniqueId,
): CallExpression =>
	createEffectInit(
		nodes.arrowFunction(createTextNodeReuse(expr, initNodeIdName), []),
		createEffectName,
	);

/**
 * @param expr Expression with string or number.
 * @param initNodeIdName Name of identifier used in {@link createReactiveExprInit} for this expression.
 *
 * @returns `(prevNodeIdName).data = (expr);`.
 */
export const createTextNodeReuse = (
	expr: Expression,
	initNodeIdName: UniqueId,
): AssignmentExpression =>
	nodes.assignmentExpression(
		'=',

		nodes.memberExpression(
			nodes.identifier(initNodeIdName),
			nodes.identifier(TEXT_NODE_DATA_KEY_NAME),
		),
		expr,
	);

/**
 * @param componentFnIdName Name of identifier of `fn` argument of `createComponent`.
 * @param props {@link ComponentProps}.
 * @param createComponentName Name of `createComponent` runtime function.
 *
 *
 * @returns Call of `createComponent` runtime function.
 */
export const createComponentInit = (
	componentFnIdName: string,
	props: ComponentProps,
	createComponentName: UniqueId,
): CallExpression =>
	nodes.callExpression(
		nodes.identifier(createComponentName),
		[nodes.identifier(componentFnIdName), nodes.objectExpression(props)],
		null,
	);

/**
 * #### Combines `insert` call with component creation.
 *
 * @param componentFnIdName Name of identifier of component function.
 * @param props {@link ComponentProps}.
 * @param anchorIdName For {@link createInsertCall}.
 * @param createComponentName Name of `createComponent` runtime function.
 * @param insertName For {@link createInsertCall}.
 *
 * @returns `insert(createComponent((() => (childrenIifeBody))()), (anchorIdName), null);`.
 */

export const createComponentInsertCall = (
	componentFnIdName: string,
	props: ComponentProps,
	anchorIdName: UniqueId,
	createComponentName: UniqueId,
	insertName: UniqueId,
): CallExpression =>
	createInsertCall(
		createComponentInit(componentFnIdName, props, createComponentName),
		anchorIdName,
		insertName,
	);

/**
 * @param body Body of function.
 * @param anchorParamName Name of `anchor` children function parameter (see the runtime type).
 *
 * @returns {ComponentChildren} {@link ComponentChildren}.
 */
export const createChildrenFn = (
	body: ArrowFunctionExpression['body'],
	anchorParamName: UniqueId,
): ComponentChildren => nodes.arrowFunction(body, [nodes.identifier(anchorParamName)]);
