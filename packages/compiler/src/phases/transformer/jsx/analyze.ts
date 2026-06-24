import type { PropsVoidKeyword } from '@void/shared';
import type {
	Node,
	Expression,
	JSXElement,
	JSXSpreadAttribute,
	JSXExpressionContainer,
	SpreadElement,
	JSXIdentifier,
} from 'oxc-parser';
import { traverse, SKIP } from 'polyast';

import { errorMessages } from '../../../errors';
import type { CompileContext } from '../../../types';
import { checkIsCapitalize } from '../../../utils';
import { generateUniqueId, type PreprocessResult } from '../../preprocessor';
import { ScopeIdType } from '../constants';
import * as nodes from '../nodes';
import { transformEnterBase, transformExitBase } from '../transform';
import type { TransformContext } from '../types';
import { createNodeCompileError, findInScopes } from '../utils';

import { JSXExprType, JSXInfoType, AttrInfoType, CHILDREN_COMPONENT_PROP_NAME } from './constants';
import { transformChildren, transformJsx } from './transform';
import type {
	JSXInfos,
	AttrInfos,
	JSXParent,
	JSXChild,
	ComponentProps,
	ComponentChildren,
} from './types';
import { createChildrenFn } from './utils';

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
 * #### Transforms JSX in attributes and expressions to IIFE via {@link transformChildren}.
 *
 * @param root Root JSX element to be analyzed.
 * @param transformContext {@link TransformContext}.
 * @param compileContext For {@link transformChildren}.
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
	const idContext = preprocessResult.idContext;

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

				const isSelfClosing = openingElement.selfClosing;
				const name = (openingElement.name as JSXIdentifier).name as
					| string
					| undefined;

				const children = node.children;

				if (!name) {
					errors.push(
						createNodeCompileError(
							errorMessages.JSX_INVALID_EL_NAME,
							node.start,
							node.end,
							transformContext,
						),
					);

					jsxInfos.push(JSXInfoType.Error);
				} else if (checkIsCapitalize(name)) {
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
					}

					const childrenAnchorParamName = generateUniqueId(idContext);
					jsxInfos.push(
						JSXInfoType.Component,
						transformProps(
							openingElement.attributes,
							createChildrenFn(
								transformChildren(
									children,
									childrenAnchorParamName,
									transformContext,
									compileContext,
									preprocessResult,
								),

								childrenAnchorParamName,
							),
							transformContext,
							compileContext,
							preprocessResult,
						),
					);

					isComponent = true;

					markParentsDynamic(nodeStack, jsxInfos, isRootJSXElement);
				} else if (!isSelfClosing && !children.length) {
					errors.push(
						createNodeCompileError(
							errorMessages.JSX_NEED_SELF_CLOSING_EL,
							node.start,
							node.end,

							transformContext,
						),
					);

					jsxInfos.push(JSXInfoType.Error);
				} else if (
					// It mutates `jsxInfos` with `AttrInfos` and `JSXInfoType`
					analyzeElAttrs(
						openingElement.attributes,
						jsxInfos,
						transformContext,
						compileContext,
						preprocessResult,
					) === JSXInfoType.DynamicParent
				) {
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
 * #### JSX inside expression is transformed via {@link transformChildren}.
 *
 * @param exprContainer Container of expr to be analyzed. Container needed 'cause function can replace the root expression.
 * @param transformContext Used in {@link transformEnterBase}.
 * @param compileContext For {@link transformChildren}.
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

	const errors = transformContext.errors;

	const scopeStack = transformContext.scopeStack;
	const componentScope = transformContext.componentScope;

	let exprType: JSXExprType = JSXExprType.Static;

	traverse<Node>(
		exprContainer,

		(node, parent, key) => {
			const nodeType = node.type;

			if (scopeStack[scopeStack.length - 1] === componentScope) {
				if (
					nodeType === 'LogicalExpression' ||
					nodeType === 'ConditionalExpression'
				) {
					errors.push(
						createNodeCompileError(
							errorMessages.JSX_EXPR_CONDITION,
							exprContainer.start,
							exprContainer.end,
							transformContext,
						),
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
 *
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
	 * Array is faster than `Set` 'cause there are not many attributes.
	 */

	const attrNames: string[] = [];

	for (let attrIndex = 0; attrIndex < attrs.length; attrIndex++) {
		const attr = attrs[attrIndex];

		// TODO: refactor: put jsxattribute logic in the condition block below
		if (attr.type === 'JSXAttribute') {
			const valueContainer = attr.value;

			if (!valueContainer) {
				errors.push(
					createNodeCompileError(
						errorMessages.JSX_ATTR_WITHOUT_VALUE,
						attr.start,
						attr.end,
						transformContext,
					),
				);
				continue;
			}
			if (valueContainer.type !== 'JSXExpressionContainer') {
				errors.push(
					createNodeCompileError(
						errorMessages.JSX_ATTR_NON_WRAPPED,
						attr.start,
						attr.end,
						transformContext,
					),
				);
				continue;
			}

			const name = attr.name.name;

			// Only `JSXNamspacedName` has an object in `name`
			if (typeof name === 'object') {
				errors.push(
					createNodeCompileError(
						errorMessages.JSX_ATTR_INVALID_NAME,
						attr.start,
						attr.end,
						transformContext,
					),
				);
				continue;
			}

			if (attrNames.includes(name)) {
				errors.push(
					createNodeCompileError(
						errorMessages.JSX_ATTR_DUPLICATE,
						attr.start,
						attr.end,
						transformContext,
					),
				);
				continue;
			}

			attrNames.push(name);

			if (name === 'ref') {
				const value = (valueContainer as JSXExpressionContainer).expression;
				if (value.type !== 'Identifier') {
					errors.push(
						createNodeCompileError(
							errorMessages.JSX_ATTR_REF_INVALID_VALUE,
							value.start,
							value.end,
							transformContext,
						),
					);
					continue;
				}
				const idType = findInScopes(value.name, scopeStack);
				if (idType === ScopeIdType.Default) {
					attrInfos.push(
						AttrInfoType.DefaultRef,
						name,

						(valueContainer as JSXExpressionContainer)
							.expression as Expression,
					);
				} else if (idType === ScopeIdType.PropRef) {
					attrInfos.push(
						AttrInfoType.PropRef,
						name,

						(valueContainer as JSXExpressionContainer)
							.expression as Expression,
					);
				} else {
					errors.push(
						createNodeCompileError(
							errorMessages.JSX_ATTR_REF_INVALID_VALUE,
							value.start,
							value.end,
							transformContext,
						),
					);
					continue;
				}

				elInfoType = JSXInfoType.DynamicParent;

				continue;
			}

			const valueExprType = analyzeExpr(
				valueContainer,
				transformContext,
				compileContext,
				preprocessResult,
			);

			if (valueExprType !== JSXExprType.Literal) {
				elInfoType = JSXInfoType.DynamicParent;
			}

			if (valueExprType !== JSXExprType.Empty) {
				attrInfos.push(
					valueExprType as unknown as AttrInfoType,
					name,

					(valueContainer as JSXExpressionContainer)
						.expression as Expression,
				);
			}
		} else {
			// `JSXSpreadAttribute` is always dynamic
			elInfoType = JSXInfoType.DynamicParent;

			const argumentExprType = analyzeExpr(
				attr,
				transformContext,
				compileContext,
				preprocessResult,
			);

			attrInfos.push(argumentExprType as unknown as AttrInfoType, attr.argument);
		}
	}

	jsxInfos.push(elInfoType, attrInfos);

	return elInfoType;
};
/**
 * #### Analyzes and transformd `props` of a component to {@link ComponentProps}.
 *
 * @param props Props of component to be transformed.
 * @param children {@link ComponentChildren} to be pushed to transformed props.
 * @param transformContext {@link TransformContext}.
 * @param compileContext {@link CompileContext}.
 * @param preprocessResult {@link PreprocessResult}.
 *
 * @returns Transformed `props` to {@link ComponentProps}.
 */

export const transformProps = (
	props: JSXElement['openingElement']['attributes'],

	children: ComponentChildren,
	transformContext: TransformContext,
	compileContext: CompileContext,
	preprocessResult: PreprocessResult,
): ComponentProps => {
	const errors = transformContext.errors;

	const propsObj: ComponentProps = [
		nodes.objectProperty(nodes.identifier(CHILDREN_COMPONENT_PROP_NAME), children),
	];

	for (let propIndex = 0; propIndex < props.length; propIndex++) {
		const prop = props[propIndex];

		if (prop.type === 'JSXAttribute') {
			const name = prop.name;
			const valueContainer = prop.value;

			if (!valueContainer) {
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
			if (valueContainer.type !== 'JSXExpressionContainer') {
				errors.push(
					createNodeCompileError(
						errorMessages.JSX_ATTR_NON_WRAPPED,
						valueContainer.start,
						valueContainer.end,
						transformContext,
					),
				);
				continue;
			}

			if (name.type === 'JSXIdentifier') {
				const propName = name.name;

				if (propName === CHILDREN_COMPONENT_PROP_NAME) {
					errors.push(
						createNodeCompileError(
							errorMessages.JSX_CHILDREN_RPOP,
							prop.start,
							prop.end,
							transformContext,
						),
					);
					continue;
				}

				transformPropExpr(
					valueContainer,
					transformContext,
					compileContext,
					preprocessResult,
				);

				const value = valueContainer.expression;
				if (value.type !== 'JSXEmptyExpression') {
					const propName = name.name;
					propsObj.push(
						nodes.objectProperty(
							propName.includes('-')
								? nodes.literal(propName)
								: nodes.identifier(propName),
							value,
						),
					);
				}
			} else {
				const namespaceName = name.namespace.name;

				const propName = name.name.name;

				if ((namespaceName as PropsVoidKeyword) === 'element') {
					const value = valueContainer.expression;

					if (
						value.type !== 'JSXElement' &&
						value.type !== 'JSXFragment'
					) {
						errors.push(
							createNodeCompileError(
								errorMessages.JSX_INVALID_ELEMENT_SPEC_PROP,
								value.start,
								value.end,
								transformContext,
							),
						);

						continue;
					}
					propsObj.push(
						nodes.objectProperty(
							propName.includes('-')
								? nodes.literal(propName)
								: nodes.identifier(propName),
						),
						value,
					);
				}

				if (
					(namespaceName as PropsVoidKeyword) === 'signal' ||
					(namespaceName as PropsVoidKeyword) === 'ref' ||
					(namespaceName as PropsVoidKeyword) === 'memo'
				) {
					const value = valueContainer.expression;

					if (value.type === 'Identifier') {
						const propName = name.name.name;

						propsObj.push(
							nodes.objectProperty(
								propName.includes('-')
									? nodes.literal(propName)
									: nodes.identifier(
											propName,
										),
								nodes.identifier(value.name),
							),
						);
					} else {
						errors.push(
							createNodeCompileError(
								errorMessages.IDENTIFIER_EXPECTED,
								value.start,
								value.end,
								transformContext,
							),
						);
					}
				}
			}
		} else {
			transformPropExpr(prop, transformContext, compileContext, preprocessResult);

			// SpreadElement and JSXSpreadAttribute are identical but have diff types
			(prop as unknown as SpreadElement).type = 'SpreadElement';

			propsObj.push(prop as unknown as SpreadElement);
		}
	}

	return propsObj;
};

/**
 * #### Transforms nodes inside `exprContainer` via {@link transformEnterBase} and {@link transformExitBase}.
 * #### Transforms JSX via {@link transformChildren}.
 *
 * @param exprContainer Container of prop value. Container needed 'cause function can replace the root expression.
 * @param transformContext {@link TransformContext}.
 * @param compileContext {@link CompileContext}.
 * @param preprocessResult {@link PreprocessResult}.
 */
export const transformPropExpr = (
	exprContainer: JSXExpressionContainer | JSXSpreadAttribute,

	transformContext: TransformContext,
	compileContext: CompileContext,
	preprocessResult: PreprocessResult,
): void => {
	const errors = transformContext.errors;
	const scopeStack = transformContext.scopeStack;
	const componentScope = transformContext.componentScope;
	// TODO: reset positions of nodes

	traverse<Node>(
		exprContainer,

		(node, parent, key) => {
			if (
				scopeStack[scopeStack.length - 1] === componentScope &&
				(node.type === 'LogicalExpression' ||
					node.type === 'ConditionalExpression')
			) {
				errors.push(
					createNodeCompileError(
						errorMessages.JSX_EXPR_CONDITION,
						exprContainer.start,
						exprContainer.end,
						transformContext,
					),
				);

				return SKIP;
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
