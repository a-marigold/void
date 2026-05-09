import type {
	Node,
	Expression,
	JSXElement,
	JSXSpreadAttribute,
	JSXExpressionContainer,
} from 'oxc-parser';
import { traverse } from 'polyast';

import { compileErrors } from '../../../errors';
import { isLowerCase } from '../../../utils';
import type { PreprocessResult } from '../../preprocessor';
import { transformEnterBase, transformExitBase } from '../transform';
import type { TransformContext, ErrorContext } from '../types';
import { findInScopes, createNodeCompileError } from '../utils';

import { JSXExprType, JSXInfoType, AttrInfoType } from './constants';
import type { JSXInfos, AttrsInfo, JSXParent, JSXChild } from './types';

// TODO: remove stack below

/**
 * Used ONLY in {@link analyzeJSX} and {@link markParentsDynamic}.
 *
 * @example
 * ```typescript
 * analyzeStack.push(
 *   Node,
 *
 *ChildIndex, // index of current processed Node child. `-1` when node is not processed
 *   InfoIndex, // start index of Node info in JSXInfos
 * );
 */
type AnalyzeStack = (JSXChild | number)[];

/**
 *
 * @example
 *
 * ```typescript
 * const baseStackOffset = analysisStack.length - AnalysisStackFrame.Size;
 * analyzeStack[baseStackOffset + AnalysisStackFrame.Node];
 *  analyzeStack[baseStackOffset + AnalysisStackFrame.ChildIndex];
 * ```
 *
 *
 *
 *
 *
 */

const enum AnalyzeStackFrame {
	Node,

	ChildIndex,

	InfoIndex,

	/**
	 *  Quantityof stack array elements that 1 frame occupies.
	 */
	Size = 3,
}

/**
 * #### Collects dynamic nodes (nodes that have expressions in attributes or reactive JSX expressions) to {@link JSXInfos}.
 * #### Checks all the JSX compile errors.
 * #### Transforms JSX expresions as well as `transform` function does.
 *
 *
 *
 * @param root
 * @param transformContext
 * @param labels
 * @param errorContext
 * @param runtimeApiNames
 *
 * @returns {JSXInfos} {@link JSXInfos}.
 */

export const analyzeJsx = (
	root: JSXParent,
	transformContext: TransformContext,
	labels: PreprocessResult['labels'],
	errorContext: ErrorContext,
	runtimeApiNames: PreprocessResult['runtimeApiNames'],
): JSXInfos => {
	const errors = errorContext.errors;

	const jsxInfos: JSXInfos = [];

	/**
	 * @see {@link AnalyzeStack}.
	 */

	const nodeStack: AnalyzeStack = [];

	if (root.type === 'JSXElement') {
		nodeStack.push(root, -1, 0);
	} else {
		const children = root.children;

		for (let childIndex = 0; childIndex < children.length; childIndex++) {
			nodeStack.push(children[childIndex], -1, childIndex);
		}
	}
	while (nodeStack.length) {
		const baseStackOffset = nodeStack.length - AnalyzeStackFrame.Size;
		const childIndex = nodeStack[
			baseStackOffset + AnalyzeStackFrame.ChildIndex
		] as number;
		const node = nodeStack[baseStackOffset + AnalyzeStackFrame.Node] as JSXChild;

		if (childIndex === -1) {
			const nodeType = node.type;

			if (nodeType === 'JSXElement') {
				const openingElement = node.openingElement;

				const tagName = openingElement.name;
				if (tagName.type !== 'JSXIdentifier') {
					errors.push(
						createNodeCompileError(
							compileErrors.JSX_INVALID_EL_NAME,

							tagName.start,
							tagName.end,
							errorContext,
						),
					);

					jsxInfos.push(JSXInfoType.Error);
				} else if (isLowerCase(tagName.name)) {
					// TODO: handle component attributes
					jsxInfos.push(JSXInfoType.Component);
				} else {
					const attrsInfo = analyzeAttributes(
						openingElement.attributes,
						transformContext,
						labels,
						runtimeApiNames,
						errorContext,
					);
					jsxInfos.push(
						// the last element is always JSXInfoType of attributes
						attrsInfo[attrsInfo.length - 1] as JSXInfoType,

						attrsInfo,
					);
				}
			} else if (nodeType === 'JSXExpressionContainer') {
				const exprType = analyzeExpr(
					node,
					transformContext,
					labels,
					runtimeApiNames,
					errorContext,
				);

				if (exprType === JSXExprType.Empty) {
					errors.push(
						createNodeCompileError(
							compileErrors.JSX_EMPTY_EXPRESSION,
							node.start,
							node.end,
							errorContext,
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
						errorContext,
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
						errorContext,
					),
				);

				jsxInfos.push(JSXInfoType.Error);
			}
		}

		const children = (node as JSXElement).children as JSXChild[] | undefined;

		if (children && childIndex < children.length) {
			const newChildIndex = childIndex + 1;

			nodeStack[baseStackOffset + AnalyzeStackFrame.ChildIndex] = newChildIndex;

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
 * #### Traverses `exprContainer` and returns {@link JSXExprType}.
 * #### Transforms nodes inside `exprContainer` via {@link transformEnterBase} and {@link transformExitBase}.
 *
 * @param exprContainer Container of a JSX expression to be analyzed.
 *   It is a container because function can replace expression inside.
 * @param transformContext Used in {@link transformEnterBase}.
 * @param labels Used in {@link transformEnterBase}.
 * @param runtimeApiNames Used in {@link transformEnterBase}.
 * @param errorContext Used in {@link transformEnterBase}.
 *
 * @returns {JSXExprType} {@link JSXExprType} of `expression`.
 *
 *
 *
 */

export const analyzeExpr = (
	exprContainer: JSXExpressionContainer | JSXSpreadAttribute,
	transformContext: TransformContext,
	labels: PreprocessResult['labels'],
	runtimeApiNames: PreprocessResult['runtimeApiNames'],
	errorContext: ErrorContext,
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

	const componentScope = transformContext.componentScope;

	traverse<Node>(
		exprContainer,
		(node, parent, key) => {
			if (
				node.type === 'Identifier' &&
				scopeStack[scopeStack.length - 1] === componentScope &&
				findInScopes(node.name, scopeStack)
			) {
				result = JSXExprType.Reactive;
			}

			return transformEnterBase(
				node,
				parent,
				key,
				transformContext,
				labels,
				runtimeApiNames,
				errorContext,
			);
		},

		(node) => {
			transformExitBase(node, scopeStack);
		},
	);

	return result;
};

/**
 *
 * #### Analyzes every attribute of JSX element attributes and creates {@link AttrsInfo} from them.
 * #### If all attributes are literals, pushes {@link JSXInfoType.LiteralAttrs} to the result, otherwise pushes {@link JSXInfoType.ExprAttrs}
 *
 * @param attributes Attributes of a JSX element.
 * @param transformContext Used in {@link transformEnterBase}.
 * @param labels Used in {@link transformEnterBase}.
 * @param runtimeApiNames Used in {@link transformEnterBase}.
 * @param errorContext Used in {@link transformEnterBase}.
 *
 *
 *
 *
 *
 *
 *
 * @returns {AttrsInfo} {@link AttrsInfo} of `attributes`.
 */
export const analyzeAttributes = (
	attributes: JSXElement['openingElement']['attributes'],

	transformContext: TransformContext,
	labels: PreprocessResult['labels'],
	runtimeApiNames: PreprocessResult['runtimeApiNames'],
	errorContext: ErrorContext,
): AttrsInfo => {
	const errors = errorContext.errors;

	const attrsInfo: AttrsInfo = [];

	let attrsInfoType: JSXInfoType.LiteralAttrs | JSXInfoType.ExprAttrs =
		JSXInfoType.LiteralAttrs;

	for (let attrIndex = 0; attrIndex < attributes.length; attrIndex++) {
		const attribute = attributes[attrIndex];

		let name = '';
		let value: JSXExpressionContainer | JSXSpreadAttribute | null = null;

		if (attribute.type === 'JSXAttribute') {
			const namedValue = attribute.value;

			if (namedValue && namedValue.type !== 'JSXExpressionContainer') {
				errors.push(
					createNodeCompileError(
						compileErrors.JSX_WRAPPED_ATTR,
						attribute.start,
						attribute.end,
						errorContext,
					),
				);

				continue;
			}

			name = attribute.name.name as string;

			value = namedValue;

			// TODO: error if value is `null`
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
							errorContext,
						),
					);
				} else {
					attrsInfo.push(
						findInScopes(
							refValue.name,

							transformContext.scopeStack,
						)
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
				labels,
				runtimeApiNames,

				errorContext,
			);
			if (exprType === JSXExprType.Empty) {
				errors.push(
					createNodeCompileError(
						compileErrors.JSX_EMPTY_EXPRESSION,
						value.start,
						value.end,
						errorContext,
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

	// the last element is ALWAYS JSXInfoType about the whole attributes
	attrsInfo.push(attrsInfoType);

	return attrsInfo;
};
