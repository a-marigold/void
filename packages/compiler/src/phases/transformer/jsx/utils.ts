import type {
	ArrowFunctionExpression,
	IdentifierName as Identifier,
	Expression,
	CallExpression,
	NullLiteral,
} from 'oxc-parser';

import type { UniqueId } from '../../preprocessor';
import * as nodes from '../nodes';
import { createEffectInit } from '../utils';

import type { ComponentChildren, ComponentProps } from './types';

/**
 * @param expr Expression for first argument of `insert`.
 * @param anchorIdName Name of identifier `anchor` argument of `insert`.
 * @param prevExpr `prevExpr` argument of `insert` runtime function.
 * @param insertName `insert` of {@link PreprocessResult.runtimeApiNames}
 *
 * @returns Call of `insert` - `insert(expr, anchorIdName, prevExprNode)`.
 */
export const createInsertCall = (
	expr: Expression,
	anchorIdName: UniqueId,
	prevExpr: Identifier | NullLiteral,
	insertName: UniqueId,
): CallExpression =>
	nodes.callExpression(
		nodes.identifier(insertName),

		[expr, nodes.identifier(anchorIdName), prevExpr],
		null,
	);
/**
 *
 * @param expr Expression for first argument of `insert`.
 * @param anchorIdName Name of identifier of `anchor` argument of `insert`.
 * @param prevExprIdName Name of identifier of `prevExprNode` for `insert`.
 * @param insertName `insert` of {@link PreprocessResult.runtimeApiNames}.
 * @param createEffectName `createEffect` of {@link PreprocessResult.runtimeApiNames}.
 *
 *
 *
 *
 * @returns Call of `createEffect` with insertion - `createEffect(() => prevExprIdName = insert(expr,anchorIdName,prevExprIdName)`
 */

export const createReactiveInsertCall = (
	expr: Expression,
	anchorIdName: UniqueId,
	prevExprIdName: UniqueId,
	insertName: UniqueId,
	createEffectName: UniqueId,
): CallExpression =>
	createEffectInit(
		nodes.arrowFunction(
			nodes.assignmentExpression(
				'=',
				nodes.identifier(prevExprIdName),
				createInsertCall(
					expr,
					anchorIdName,
					nodes.identifier(prevExprIdName),
					insertName,
				),
			),
			[],
		),

		createEffectName,
	);

/**
 * @param componentFnIdName Name of identifier of `fn` argument of `createComponent`.
 * @param props {@link ComponentProps}.
 * @param createComponentName Name of `createComponent` runtime function.
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
		nodes.literal<NullLiteral>(null),

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
