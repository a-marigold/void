import type { TraceMap } from '@jridgewell/trace-mapping';
import type {
	Node,
	Expression,
	JSXElement,
	JSXSpreadAttribute,
	JSXExpressionContainer,
} from 'oxc-parser';
import { traverse } from 'polyast';

import { compileErrors } from '../../../errors';
import type { CompileError } from '../../../errors';
import { isLowerCase } from '../../../utils';
import type { PreprocessResult } from '../../preprocessor';
import { transformEnterBase, transformExitBase } from '../transform';
import type { TransformContext, ErrorContext } from '../types';
import { findInScopes, createNodeCompileError } from '../utils';

import { JSXExprType, JSXInfoType } from './constants';
import type { JSXInfos, AttrsInfo, JSXParent, JSXChild } from './types';

/**
 * Used ONLY in {@link analyzeJSX} and {@link markParentsDynamic}.
 *
 *      @example
 *
 * ```typescript
 * analyzeStack.push(
 *   Node,
 *
 *
 *    ChildIndex, // index of current processed Node child. `-1` when node is not processed
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
 * #### Collects dynamic nodes (nodes that have reactive attributes or reactive JSX expressions) to {@link JSXInfos}.
 * #### Checks all the JSX compile errors.
 * #### Transforms JSX expresions as well as `transform` function does.
 *
 * @param root - Root element of JSX that is to be analyzed.
 * @param traceMap {@link TraceMap}.
 * @param errors Array with {@link CompileError} instances.
 *
 *
 * @returns {JSXInfos} {@link JSXInfos}.
 *
 * @example
 *
 *
 *
 *
 *
 *
 *
 * ```tsx
 * <>
 *   <div> // Dynamic because it contains dynamic node
 *     <span> {count} </span> // Dynamic because it contains reactive expression
 *   </div>
 *   <CountButton count={count} /> // Components are always dynamic nodes
 * </>
 * ```
 *
 *
 *

 */

export const analyzeJsx = (
	root: JSXParent,

	transformContext: TransformContext,
	labels: PreprocessResult['labels'],
	runtimeApiNames: PreprocessResult['runtimeApiNames'],
	errorContext: ErrorContext,
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

					jsxInfos.push(JSXInfoType.NoInfo);
				} else if (isLowerCase(tagName.name)) {
					markParentsDynamic(nodeStack, jsxInfos);

					jsxInfos.push(JSXInfoType.Component);
				} else {
					const attributesInfo = analyzeAttributes(
						openingElement.attributes,
						transformContext,
						labels,
						runtimeApiNames,
						errorContext,
					);
					if (attributesInfo) {
						markParentsDynamic(nodeStack, jsxInfos);

						jsxInfos.push(
							JSXInfoType.AttributeElement,
							attributesInfo,
						);
					} else {
						jsxInfos.push(JSXInfoType.NoInfo);
					}
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

					jsxInfos.push(JSXInfoType.NoInfo);
				} else {
					markParentsDynamic(nodeStack, jsxInfos);

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

				jsxInfos.push(JSXInfoType.NoInfo);
			} else if (nodeType === 'JSXSpreadChild') {
				errors.push(
					createNodeCompileError(
						compileErrors.JSX_SPREAD_CHILDREN,
						node.start,
						node.end,
						errorContext,
					),
				);
				jsxInfos.push(JSXInfoType.NoInfo);
			} else {
				jsxInfos.push(JSXInfoType.NoInfo);
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
 * #### Makes all parents of last node in `nodeStack` dynamic with {@link JSXInfoType.Parent}.
 * #### Stops when finds a parent that is already in `dynamicNodes` not to reset its dynamic info.
 *
 * @param nodeStack {@link AnalyzeStack} from {@link analyzeJsx} function.
 * @param jsxInfos {@link JSXInfos}.
 *
 */
export const markParentsDynamic = (nodeStack: AnalyzeStack, jsxInfos: JSXInfos): void => {
	let baseStackOffset = nodeStack.length - AnalyzeStackFrame.Size - AnalyzeStackFrame.Size;
	let parentInfoIndex = nodeStack[baseStackOffset + AnalyzeStackFrame.InfoIndex] as number;

	while (baseStackOffset >= 0 && jsxInfos[parentInfoIndex] === JSXInfoType.NoInfo) {
		jsxInfos[parentInfoIndex] = JSXInfoType.Parent;
		baseStackOffset -= AnalyzeStackFrame.Size;

		parentInfoIndex = jsxInfos[
			nodeStack[baseStackOffset + AnalyzeStackFrame.InfoIndex] as number
		] as number;
	}
};

/**
 * #### Traverses `expression` and returns {@link JSXExprType}.
 * #### Transforms nodes inside `expression` via {@link transformEnterBase} and {@link transformExitBase}.
 *
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
 * #### Analyzes every attribute of JSX element attributes and creates {@link AttrsInfo} from them.
 *
 * #### Attributes are considered dynamic if at least one attribute is `JSXSpreadAttribute`, `JSXEmptyExpression` or `Expression`.
 *
 * @param attributes Attributes of a JSX element.
 * @param transformContext Used in {@link transformEnterBase}.
 * @param labels Used in {@link transformEnterBase}.
 * @param runtimeApiNames Used in {@link transformEnterBase}.
 * @param errorContext Used in {@link transformEnterBase}.
 *
 *
 * @returns {AttributeInfo} {@link AttriubtesInfo} or `null` attributes are only literals.
 */
export const analyzeAttributes = (
	attributes: JSXElement['openingElement']['attributes'],
	transformContext: TransformContext,
	labels: PreprocessResult['labels'],
	runtimeApiNames: PreprocessResult['runtimeApiNames'],
	errorContext: ErrorContext,
): AttrsInfo | null => {
	const errors = errorContext.errors;

	let attrsInfo: AttrsInfo | null = null;

	for (let attrIndex = 0; attrIndex < attributes.length; attrIndex++) {
		const attribute = attributes[attrIndex];

		let attrValue: JSXExpressionContainer | JSXSpreadAttribute | null = null;

		const isNamed = attribute.type === 'JSXAttribute';

		if (isNamed) {
			const value = attribute.value;

			if (value && value.type !== 'JSXExpressionContainer') {
				errors.push(
					createNodeCompileError(
						compileErrors.JSX_LITERAL_ATTR,
						attribute.start,
						attribute.end,
						errorContext,
					),
				);

				continue;
			}

			attrValue = value;

			// TODO: error if value is `null`
		} else {
			attrValue = attribute;
		}

		if (attrValue) {
			const exprType = analyzeExpr(
				attrValue,
				transformContext,
				labels,
				runtimeApiNames,
				errorContext,
			);

			if (exprType === JSXExprType.Empty) {
				errors.push(
					createNodeCompileError(
						compileErrors.JSX_EMPTY_EXPRESSION,

						attrValue.start,
						attrValue.end,
						errorContext,
					),
				);

				attrsInfo ||= [];

				continue;
			}

			if (exprType >= JSXExprType.Static || !isNamed) {
				// `JSXSpreadAttribute` is always dynamic

				attrsInfo ||= [];
			}

			attrsInfo?.push(
				exprType,

				isNamed ? (attribute.name.name as string) : '',

				isNamed
					? ((attrValue as JSXExpressionContainer)
							.expression as Expression)
					: (attrValue as JSXSpreadAttribute).argument,
			);
		}
	}

	return attrsInfo;
};
