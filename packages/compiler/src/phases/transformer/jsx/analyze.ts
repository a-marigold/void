import type { PropsVoidKeyword } from '@void/shared';
import type {
	Node,
	Expression,
	JSXElement,
	JSXSpreadAttribute,
	JSXExpressionContainer,
	ObjectExpression,
} from 'oxc-parser';
import { SKIP, traverse } from 'polyast';

import { errorMessages } from '../../../errors';
import type { CompileContext } from '../../../types';
import { checkLowerCase } from '../../../utils';
import type { PreprocessResult } from '../../preprocessor';
import { ScopeIdType } from '../constants';
import * as nodes from '../nodes';
import { transformEnterBase, transformExitBase } from '../transform';
import type { TransformContext } from '../types';
import { replaceNode, createNodeCompileError, findInScopes } from '../utils';

import { JSXExprType, JSXInfoType, AttrInfoType } from './constants';
import { transformJsxExpr } from './transform';
import type { JSXInfos, AttrInfos, JSXParent, JSXChild } from './types';
import { createIife } from './utils';

/**
 * Stack that {@link analyzeJsx} function builds.
 *
 * The last node is always the current being processed child, and all nodes before it are its parents.
 *
 * 	@example
 * ```typescript
 * nodeStack.push(
 *   Node,
 *   ChildIndex, // index of current Node child. it is `-1` when Node is not being processed
 *   InfoIndex, // Start index of Node in `JSXInfos`.
 * );
 * ```
 */
type AnalyzeStack = (JSXChild | number)[];

/**
 * 	@example
 *
 * ```typescript
 * const frameOffset = nodeStack.length - NodeStackFrame.Size;
 * nodeStack[frameOffset + NodeStackFrame.Node];
 *
 * nodeStack[frameOffset + NodeStackFrame.ChildIndex];
 * ```
 *
 */

const enum AnalyzeStackFrame {
	Node,

	ChildIndex,

	InfoIndex,

	/**
	 * Quantityof stack array elements occupied by 1 frame.
	 */
	Size = 3,
}
/**
 * #### Collects information about nodes to the result.
 * #### Tree traversal order is DFS (see the implementation).
 * #### Checks all the JSX compile errors.
 * #### Transforms expressions as well as `transform` function does.
 * #### Transforms JSX in attributes and expressions to IIFE via {@link transformJsxExpr}.
 *
 * @param root Root JSX element to be analyzed.
 * @param transformContext {@link TransformContext}.
 * @param compileContext For {@link transformJsxExpr}.
 * @param preprocessResult {@link PreprocessResult}.
 *
 * @returns {JSXInfos} {@link JSXInfos}.
 */

export const analyzeJsx = (
	root: JSXParent,

	transformContext: TransformContext,
	compileContext: CompileContext,
	preprocessResult: PreprocessResult,
): JSXInfos => {
	const errors = transformContext.errors;

	/**
	 * Flag indicating is {@link root} `JSXElement` or not.
	 */
	const isRootJSXElement = root.type === 'JSXElement';

	const jsxInfos: JSXInfos = [];

	const nodeStack: AnalyzeStack = [root, -1, 0];

	while (nodeStack.length) {
		const frameOffset = nodeStack.length - AnalyzeStackFrame.Size;

		const node = nodeStack[frameOffset + AnalyzeStackFrame.Node] as JSXChild;
		const childIndex = nodeStack[frameOffset + AnalyzeStackFrame.ChildIndex] as number;

		let isComponent: boolean = false;

		if (childIndex === -1 && (isRootJSXElement || node !== root)) {
			const nodeType = node.type;

			if (nodeType === 'JSXElement') {
				const openingElement = node.openingElement;

				const tagName = openingElement.name;
				const isSelfClosing = openingElement.selfClosing;

				const children = node.children;

				if (!isSelfClosing && !children.length) {
					errors.push(
						createNodeCompileError(
							errorMessages.JSX_NEED_SELF_CLOSING_EL,
							node.start,
							node.end,

							transformContext,
						),
					);

					jsxInfos.push(JSXInfoType.Error);
				} else if (tagName.type !== 'JSXIdentifier') {
					errors.push(
						createNodeCompileError(
							errorMessages.JSX_INVALID_EL_NAME,
							tagName.start,
							tagName.end,
							transformContext,
						),
					);

					jsxInfos.push(JSXInfoType.Error);
				} else if (checkLowerCase(tagName.name[0])) {
					if (
						// It mutates `jsxInfos` with `AttrInfos` and `JSXInfoType`
						analyzeElAttrs(
							node.openingElement.attributes,
							jsxInfos,
							transformContext,
							compileContext,
							preprocessResult,
						) === JSXInfoType.DynamicParent
					) {
						markParentsDynamic(
							nodeStack,

							jsxInfos,

							isRootJSXElement,
						);
					}
				} else {
					// TODO: handle component attributes
					jsxInfos.push(
						JSXInfoType.Component,
						isSelfClosing
							? []
							: transformJsxExpr(
									nodes.jsxFragment(children),
									compileContext,
									transformContext,
									preprocessResult,
								),
					);

					isComponent = true;

					markParentsDynamic(nodeStack, jsxInfos, isRootJSXElement);
				}
			} else if (nodeType === 'JSXText') {
				jsxInfos.push(JSXInfoType.Text);
			} else if (nodeType === 'JSXExpressionContainer') {
				const exprType = analyzeExpr(
					node,
					transformContext,
					compileContext,
					preprocessResult,
				);

				if (exprType === JSXExprType.Empty) {
					errors.push(
						createNodeCompileError(
							errorMessages.JSX_EMPTY_EXPRESSION,
							node.start,
							node.end,
							transformContext,
						),
					);

					jsxInfos.push(JSXInfoType.Error);
				} else {
					jsxInfos.push(exprType as unknown as JSXInfoType);

					if (exprType !== JSXExprType.Literal) {
						markParentsDynamic(
							nodeStack,
							jsxInfos,
							isRootJSXElement,
						);
					}
				}
			} else if (nodeType === 'JSXFragment') {
				errors.push(
					createNodeCompileError(
						errorMessages.JSX_NESTED_FRAGMENT,

						node.start,
						node.end,

						transformContext,
					),
				);

				jsxInfos.push(JSXInfoType.Error);
			} else {
				errors.push(
					createNodeCompileError(
						errorMessages.JSX_SPREAD_CHILDREN,

						node.start,

						node.end,
						transformContext,
					),
				);
				jsxInfos.push(JSXInfoType.Error);
			}
		}

		const children = (node as JSXElement).children as JSXChild[] | undefined;

		// Pick the next child only if node has children and only if it is not a component

		if (children && !isComponent) {
			const newChildIndex = childIndex + 1;

			if (newChildIndex < children.length) {
				nodeStack[frameOffset + AnalyzeStackFrame.ChildIndex] =
					newChildIndex;
				nodeStack.push(children[newChildIndex], -1, jsxInfos.length);

				continue;
			}
		}

		nodeStack.pop();
		nodeStack.pop();
		nodeStack.pop();
	}
	return jsxInfos;
};

/**
 *
 * #### Sets all parents of the last `nodeStack` node to {@link JSXInfoType.DynamicParent} in `jsxInfos`.
 *
 * @param nodeStack {@link AnalyzeStack}.
 * @param jsxInfos {@link JSXInfos}.
 * @param isRootJSXElement `true` when the root JSX node is a `JSXElement`, `false` when it is `JSXFragment`.
 */

export const markParentsDynamic = (
	nodeStack: AnalyzeStack,
	jsxInfos: JSXInfos,
	isRootJSXElement: boolean,
): void => {
	/**
	 *
	 *
	 * It is needed 'cause if the root is a `JSXFragment`,
	 * its info type must NOT be set to {@link JSXInfoType.DynamicParent}.
	 *
	 */

	const minStackOffset = isRootJSXElement ? 0 : AnalyzeStackFrame.Size;

	// Subtract `Size` twice to access parent of the last node
	let parentStackOffset = nodeStack.length - AnalyzeStackFrame.Size - AnalyzeStackFrame.Size;

	let parentInfoIndex: number = nodeStack[
		parentStackOffset + AnalyzeStackFrame.InfoIndex
	] as number;

	while (
		parentStackOffset >= minStackOffset &&
		jsxInfos[parentInfoIndex] !== JSXInfoType.DynamicParent
	) {
		jsxInfos[parentInfoIndex] = JSXInfoType.DynamicParent;
		parentStackOffset -= AnalyzeStackFrame.Size;

		parentInfoIndex = nodeStack[
			parentStackOffset + AnalyzeStackFrame.InfoIndex
		] as number;
	}
};

/**
 *
 * #### Transforms nodes inside `exprContainer` via {@link transformEnterBase} and {@link transformExitBase}.
 * #### JSX inside expression is transformed via {@link transformJsxExpr}.
 *
 * @param exprContainer Container of expr to be analyzed. Container needed 'cause function can replace the root expression.
 * @param transformContext Used in {@link transformEnterBase}.
 * @param compileContext For {@link transformJsxExpr}.
 * @param preprocessResult {@link PreprocessResult}.
 *
 * @returns {JSXExprType} {@link JSXExprType} of `expression`.
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */

export const analyzeExpr = (
	exprContainer: JSXExpressionContainer | JSXSpreadAttribute,
	transformContext: TransformContext,
	compileContext: CompileContext,

	preprocessResult: PreprocessResult,
): JSXExprType => {
	const rootExprType = (
		exprContainer.type === 'JSXExpressionContainer'
			? exprContainer.expression
			: exprContainer.argument
	).type;
	if (rootExprType === 'Literal') {
		return JSXExprType.Literal;
	}
	if (rootExprType === 'JSXEmptyExpression') {
		return JSXExprType.Empty;
	}

	const scopeStack = transformContext.scopeStack;

	let exprType: JSXExprType = JSXExprType.Static;

	const componentScope = transformContext.componentScope;

	traverse<Node>(
		exprContainer,

		(node, parent, key) => {
			const nodeType = node.type;

			if (scopeStack[scopeStack.length - 1] === componentScope) {
				if (nodeType === 'JSXElement' || nodeType === 'JSXFragment') {
					replaceNode(
						createIife(
							transformJsxExpr(
								node,
								compileContext,
								transformContext,
								preprocessResult,
							),
						),

						parent as Node,
						key,
					);

					return SKIP;
				}

				if (nodeType === 'Identifier') {
					const idType = findInScopes(node.name, scopeStack);

					if (
						idType === ScopeIdType.Signal ||
						idType === ScopeIdType.Memo
					) {
						exprType = JSXExprType.Reactive;
					}
				}
			}

			return transformEnterBase(
				node,
				parent,
				key,
				transformContext,
				compileContext,
				preprocessResult,
			);
		},

		(node, parent) => {
			transformExitBase(node, parent, transformContext);
		},
	);

	return exprType;
};

/**
 *
 * #### Analyzes JSX element's `attrs` via {@link analyzeExpr}.
 * #### Pushes {@link JSXInfoType} of JSX element that obtains `attrs` and {@link AttrInfos} of it to `jsxInfos`.
 *
 *
 * @param attrs Attributes of a JSX element.
 * @param jsxInfos {@link JSXInfos} to be mutated with the result.
 * @param transformContext For {@link analyzeExpr}.
 * @param compileContext For {@link analyzeExpr}.
 * @param preprocessResult {@link PreprocessResult}.
 *
 * @returns {JSXInfoType} {@link JSXInfoType} of element that obtains `attrs`.
 */
export const analyzeElAttrs = (
	attrs: JSXElement['openingElement']['attributes'],
	jsxInfos: JSXInfos,
	transformContext: TransformContext,
	compileContext: CompileContext,
	preprocessResult: PreprocessResult,
): JSXInfoType => {
	const scopeStack = transformContext.scopeStack;

	const errors = transformContext.errors;

	let elInfoType: JSXInfoType = JSXInfoType.StaticParent;
	const attrInfos: AttrInfos = [];

	/**
	 *
	 * Names of attributes for finding duplicates.
	 *
	 * Array is faster than `Set` for this task.
	 */

	const attrNames: string[] = [];

	for (let attrIndex = 0; attrIndex < attrs.length; attrIndex++) {
		const attribute = attrs[attrIndex];

		let name = '';
		let value: JSXExpressionContainer | JSXSpreadAttribute | null = null;

		if (attribute.type === 'JSXAttribute') {
			const namedValue = attribute.value;

			if (!namedValue) {
				errors.push(
					createNodeCompileError(
						errorMessages.JSX_ATTR_WITHOUT_VALUE,
						attribute.start,

						attribute.end,
						transformContext,
					),
				);
				continue;
			}
			if (namedValue.type !== 'JSXExpressionContainer') {
				errors.push(
					createNodeCompileError(
						errorMessages.JSX_ATTR_NON_WRAPPED,
						attribute.start,

						attribute.end,
						transformContext,
					),
				);
				continue;
			}

			const attrName = attribute.name.name;

			// Only `JSXNamspacedName` has an object in `name`
			if (typeof attrName === 'object') {
				errors.push(
					createNodeCompileError(
						errorMessages.JSX_ATTR_INVALID_NAME,
						attribute.start,
						attribute.end,
						transformContext,
					),
				);

				continue;
			}

			name = attrName;

			if (attrNames.includes(name)) {
				errors.push(
					createNodeCompileError(
						errorMessages.JSX_ATTR_DUPLICATE,
						attribute.start,
						attribute.end,
						transformContext,
					),
				);
				continue;
			}

			attrNames.push(name);

			value = namedValue;
		} else {
			// `JSXSpreadAttribute` is always dynamic
			elInfoType = JSXInfoType.DynamicParent;

			value = attribute;
		}

		if (name === 'ref') {
			const refValue = (value as JSXExpressionContainer).expression;
			if (refValue.type !== 'Identifier') {
				errors.push(
					createNodeCompileError(
						errorMessages.JSX_ATTR_REF_INVALID_VALUE,
						refValue.start,
						refValue.end,
						transformContext,
					),
				);
				continue;
			}

			const idType = findInScopes(refValue.name, scopeStack);
			if (idType === ScopeIdType.Default) {
				attrInfos.push(
					AttrInfoType.DefaultRef,
					name,

					(value as JSXExpressionContainer).expression as Expression,
				);
			} else if (idType === ScopeIdType.PropRef) {
				attrInfos.push(
					AttrInfoType.PropRef,
					name,

					(value as JSXExpressionContainer).expression as Expression,
				);
			} else {
				errors.push(
					createNodeCompileError(
						errorMessages.JSX_ATTR_REF_INVALID_VALUE,
						refValue.start,
						refValue.end,
						transformContext,
					),
				);
				continue;
			}

			elInfoType = JSXInfoType.DynamicParent;

			continue;
		}

		const valueExprType = analyzeExpr(
			value,
			transformContext,
			compileContext,
			preprocessResult,
		);

		if (valueExprType !== JSXExprType.Literal) {
			elInfoType = JSXInfoType.DynamicParent;
		}

		attrInfos.push(
			valueExprType as unknown as AttrInfoType,
			name,

			name
				? ((value as JSXExpressionContainer).expression as Expression)
				: (value as JSXSpreadAttribute).argument,
		);
	}

	jsxInfos.push(elInfoType, attrInfos);

	return elInfoType;
};

export const analyzeProps = (
	props: JSXElement['openingElement']['attributes'],
	transformContext: TransformContext,
	compileContext: CompileContext,
	preprocessResult: PreprocessResult,
) => {
	const errors = transformContext.errors;

	const newProps: ObjectExpression['properties'] = [];

	for (let propIndex = 0; propIndex < props.length; propIndex++) {
		const prop = props[propIndex];

		if (prop.type === 'JSXAttribute') {
			const name = prop.name;
			const value = prop.value;

			if (!value) {
				errors.push(
					createNodeCompileError(
						errorMessages.JSX_ATTR_WITHOUT_VALUE,
						prop.start,
						prop.end,
						transformContext,
					),
				);
				continue;
			}
			if (value.type !== 'JSXExpressionContainer') {
				errors.push(
					createNodeCompileError(
						errorMessages.JSX_ATTR_NON_WRAPPED,
						value.start,
						value.end,
						transformContext,
					),
				);
				continue;
			}

			const valueExpr = value.expression;

			if (name.type === 'JSXNamespacedName') {
				const namespaceName = name.namespace.name;

				if (
					(namespaceName as PropsVoidKeyword) === 'signal' ||
					(namespaceName as PropsVoidKeyword) === 'ref' ||
					(namespaceName as PropsVoidKeyword) === 'memo'
				) {
					if (valueExpr.type !== 'Identifier') {
						errors.push(
							createNodeCompileError(
								errorMessages.JSX_SPEC_PROP_NON_IDENTIFIER,
								valueExpr.start,
								valueExpr.end,
								transformContext,
							),
						);
						continue;
					}
				}
			}

			const valueExprType = analyzeExpr(
				value,
				transformContext,
				compileContext,
				preprocessResult,
			);
		}
	}
};

/**
 * #### Transforms nodes inside `exprContainer` via {@link transformEnterBase} and {@link transformExitBase}.
 * #### Transforms JSX via {@link transformJsxExpr}.
 *
 * @param exprContainer Container of prop value. Container needed 'cause function can replace the root expression.
 * @param transformContext {@link TransformContext}.
 * @param compileContext {@link CompileContext}.
 * @param preprocessResult {@link PreprocessResult}.
 */
export const transformPropExpr = (
	exprContainer: JSXExpressionContainer,
	transformContext: TransformContext,
	compileContext: CompileContext,
	preprocessResult: PreprocessResult,
): void => {
	const scopeStack = transformContext.scopeStack;
	const componentScope = transformContext.componentScope;

	traverse<Node>(
		exprContainer,
		(node, parent, key) => {
			if (
				scopeStack[scopeStack.length - 1] === componentScope &&
				(node.type === 'JSXElement' || node.type === 'JSXFragment')
			) {
				replaceNode(
					createIife(
						transformJsxExpr(
							node,
							compileContext,
							transformContext,
							preprocessResult,
						),
					),
					parent as Node,
					key,
				);

				return;
			}

			return transformEnterBase(
				node,
				parent,
				key,
				transformContext,
				compileContext,

				preprocessResult,
			);
		},
		(node, parent) => {
			transformExitBase(node, parent, transformContext);
		},
	);
};
