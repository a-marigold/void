import type {
	Node,
	Expression,
	JSXElement,
	JSXSpreadAttribute,
	JSXExpressionContainer,
} from 'oxc-parser';
import { SKIP, traverse } from 'polyast';

import { compileErrors } from '../../../errors';
import type { CompileContext } from '../../../types';
import { checkLowerCase } from '../../../utils';
import type { PreprocessResult } from '../../preprocessor';
import { ScopeIdType } from '../constants';
import { transformEnterBase, transformExitBase } from '../transform';
import type { TransformContext } from '../types';
import { replaceNode, createNodeCompileError, findInScopes } from '../utils';

import { JSXExprType, JSXInfoType, AttrInfoType } from './constants';
import { transformJsxExpr } from './transform';
import type { JSXInfos, AttrsInfo, JSXParent, JSXChild } from './types';

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
 *
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
 * #### Transforms JSX elements in attributes and expressions to IIFE via {@link transformJsxExpr}.
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

	const jsxInfos: JSXInfos = [];

	const nodeStack: AnalyzeStack = [];

	if (root.type === 'JSXElement') {
		nodeStack.push(root, -1, 0);
	} else {
		const children = root.children;

		for (let childIndex = children.length - 1; childIndex >= 0; childIndex--) {
			nodeStack.push(children[childIndex], -1);
		}
	}

	while (nodeStack.length) {
		const frameOffset = nodeStack.length - AnalyzeStackFrame.Size;

		const node = nodeStack[frameOffset + AnalyzeStackFrame.Node] as JSXChild;
		const childIndex = nodeStack[frameOffset + AnalyzeStackFrame.ChildIndex] as number;
		const infoIndex = nodeStack[frameOffset + AnalyzeStackFrame.InfoIndex] as number;

		if (childIndex === -1) {
			const nodeType = node.type;

			if (nodeType === 'JSXElement') {
				const openingElement = node.openingElement;

				const tagName = openingElement.name;

				const children = node.children;

				if (!children.length && node.closingElement) {
					errors.push(
						createNodeCompileError(
							compileErrors.JSX_NEED_SELF_CLOSING_EL,
							node.start,

							node.end,

							transformContext,
						),
					);
					jsxInfos.push(JSXInfoType.Error);
				} else if (tagName.type !== 'JSXIdentifier') {
					errors.push(
						createNodeCompileError(
							compileErrors.JSX_INVALID_EL_NAME,
							tagName.start,
							tagName.end,
							transformContext,
						),
					);
					jsxInfos.push(JSXInfoType.Error);
				} else if (checkLowerCase(tagName.name[0])) {
					jsxInfos.push(
						JSXInfoType.StaticParent,
						analyzeAttrs(
							openingElement.attributes,
							transformContext,
							compileContext,
							preprocessResult,
						),
					);
				} else {
					// TODO: handle component attributes
					jsxInfos.push(JSXInfoType.Component);
				}
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
							compileErrors.JSX_EMPTY_EXPRESSION,

							node.start,

							node.end,

							transformContext,
						),
					);

					jsxInfos.push(JSXInfoType.Error);
				} else {
					jsxInfos.push(exprType as unknown as JSXInfoType);
				}
			} else if (nodeType === 'JSXFragment') {
				errors.push(
					createNodeCompileError(
						compileErrors.JSX_NESTED_FRAGMENT,
						node.start,
						node.end,
						transformContext,
					),
				);

				jsxInfos.push(JSXInfoType.Error);
			} else if (nodeType === 'JSXText') {
				jsxInfos.push(JSXInfoType.Text);
			} else {
				errors.push(
					createNodeCompileError(
						compileErrors.JSX_SPREAD_CHILDREN,
						node.start,
						node.end,
						transformContext,
					),
				);

				jsxInfos.push(JSXInfoType.Error);
			}
		}

		const children = (node as JSXElement).children as JSXChild[] | undefined;

		const newChildIndex = childIndex + 1;

		if (children && newChildIndex < children.length) {
			nodeStack[frameOffset + AnalyzeStackFrame.ChildIndex] = newChildIndex;
			nodeStack.push(children[newChildIndex], -1, jsxInfos.length);
		} else {
			nodeStack.pop();
			nodeStack.pop();
			nodeStack.pop();
		}
	}
	return jsxInfos;
};

/**
 *
 * #### Sets all parents of the last `nodeStack` node to {@link JSXInfoType.DynamicParent} in `jsxInfos`.
 *
 * @param nodeStack {@link AnalyzeStack}.
 * @param jsxInfos {@link JSXInfos}.
 */

export const markParentsDynamic = (nodeStack: AnalyzeStack, jsxInfos: JSXInfos): void => {
	// Subtract `Size` twice to access parent of the last node

	let parentStackOffset = nodeStack.length - AnalyzeStackFrame.Size - AnalyzeStackFrame.Size;

	let parentInfoIndex: number = nodeStack[
		parentStackOffset + AnalyzeStackFrame.InfoIndex
	] as number;

	while (parentStackOffset >= 0 && jsxInfos[parentInfoIndex] !== JSXInfoType.DynamicParent) {
		jsxInfos[parentInfoIndex] = JSXInfoType.DynamicParent;

		parentStackOffset -= AnalyzeStackFrame.Size;

		parentInfoIndex = nodeStack[
			parentStackOffset + AnalyzeStackFrame.InfoIndex
		] as number;
	}
};

/**
 *
 *
 *
 *
 *
 *
 * #### Traverses `exprContainer` and returns {@link JSXExprType}.
 * #### Transforms nodes inside `exprContainer` via {@link transformEnterBase} and {@link transformExitBase}.
 * #### JSX inside expression is transformed via {@link transformJsxExpr}.
 *
 *
 *
 *
 * @param exprContainer Container of a JSX expression to be analyzed.
 *       It is a container because function can replace the root node (expression) inside.
 * @param transformContext Used in {@link transformEnterBase}.
 * @param compileContext For {@link transformJsxExpr}.
 * @param preprocessResult {@link PreprocessResult}.
 *
 * @returns {JSXExprType} {@link JSXExprType} of `expression`.
 */

export const analyzeExpr = (
	exprContainer: JSXExpressionContainer | JSXSpreadAttribute,
	transformContext: TransformContext,
	compileContext: CompileContext,
	preprocessResult: PreprocessResult,
): JSXExprType => {
	const expression =
		exprContainer.type === 'JSXExpressionContainer'
			? exprContainer.expression
			: exprContainer.argument;

	const exprType = expression.type;

	if (exprType === 'Literal') {
		return JSXExprType.Literal;
	}

	if (exprType === 'JSXEmptyExpression') {
		return JSXExprType.Empty;
	}

	const scopeStack = transformContext.scopeStack;

	let result: JSXExprType = JSXExprType.Static;

	const componentFnScope = transformContext.componentFnScope;
	traverse<Node>(
		exprContainer,
		(node, parent, key) => {
			const nodeType = node.type;

			if (
				transformContext.fnScopeCount === componentFnScope &&
				parent &&
				// ensure it is not inside an arrow fn
				(parent as Node).type !== 'ArrowFunctionExpression'
			) {
				if (nodeType === 'JSXElement' || nodeType === 'JSXFragment') {
					replaceNode(
						transformJsxExpr(
							node,
							compileContext,
							transformContext,
							preprocessResult,
						),
						parent,
						key,
					);

					return SKIP;
				}

				if (
					nodeType === 'Identifier' &&
					findInScopes(node.name, scopeStack)
				) {
					result = JSXExprType.Reactive;
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

	return result;
};

/**
 *
 * #### Analyzes every attribute via {@link analyzeExpr} of JSX element attributes and creates {@link AttrsInfo} from them.
 * #### Used only with plain element attributes, not with component attributes.
 *
 *
 * @param attrs Attributes of a JSX element.
 * @param transformContext For {@link analyzeExpr}.
 * @param compileContext For {@link analyzeExpr}.
 * @param preprocessResult {@link PreprocessResult}.
 *
 *
 *
 *
 * @returns {AttrsInfo} {@link AttrsInfo} of `attributes`.
 *
 *
 */
export const analyzeAttrs = (
	attrs: JSXElement['openingElement']['attributes'],
	transformContext: TransformContext,
	compileContext: CompileContext,
	preprocessResult: PreprocessResult,
): AttrsInfo => {
	const errors = transformContext.errors;

	const attrsInfo: AttrsInfo = [];

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
						compileErrors.JSX_ATTR_WITHOUT_VALUE,
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
						compileErrors.JSX_WRAPPED_ATTR,
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
						compileErrors.JSX_ATTR_INVALID_NAME,
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
						compileErrors.JSX_ATTR_DUPLICATE,

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
			value = attribute;
		}

		if (value) {
			if (name === 'ref') {
				const refValue = (value as JSXExpressionContainer).expression;

				if (refValue.type !== 'Identifier') {
					errors.push(
						createNodeCompileError(
							compileErrors.JSX_REF_INVALID_VALUE,
							attribute.start,
							attribute.end,
							transformContext,
						),
					);
				} else {
					attrsInfo.push(
						findInScopes(
							refValue.name,

							transformContext.scopeStack,
						) === ScopeIdType.Signal
							? AttrInfoType.SignalRef
							: AttrInfoType.StaticRef,
						name,
						refValue,
					);
				}

				continue;
			}

			const exprType = analyzeExpr(
				value,

				transformContext,
				compileContext,
				preprocessResult,
			);

			if (exprType === JSXExprType.Empty) {
				errors.push(
					createNodeCompileError(
						compileErrors.JSX_EMPTY_EXPRESSION,
						value.start,
						value.end,
						transformContext,
					),
				);

				continue;
			}

			attrsInfo.push(
				exprType as unknown as AttrInfoType,
				name,
				name
					? ((value as JSXExpressionContainer)
							.expression as Expression)
					: (value as JSXSpreadAttribute).argument,
			);
		}
	}

	return attrsInfo;
};
