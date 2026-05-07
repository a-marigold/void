import type {
	StringLiteral,
	IdentifierName as Identifier,
	Expression,
	MemberExpression,
	JSXElement,
	JSXAttribute,
	JSXIdentifier,
	CallExpression,
	VariableDeclarator,
	JSXExpressionContainer,
	AssignmentExpression,
} from 'oxc-parser';

import type { PreprocessResult } from '../../preprocessor';
import { generateUniqueIdentifier } from '../../preprocessor';
import * as nodes from '../nodes';
import { createEffectCall } from '../utils';

import {
	ANCHOR_HTML_TAG,
	FIRST_CHILD_ACCESS,
	NEXT_SIBLING_ACCESSOR,
	JSXExprType,
	JSXInfoType,
	AttributeInfo,
	SPEC_ATTR_NAMES,
} from './constants';
import type { TransformJSXResult, JSXInfos, AttributesInfo, JSXParent, JSXChild } from './types';

export const transformJsx = (
	root: JSXParent,

	jsxInfos: JSXInfos,
	identifiers: PreprocessResult['identifiers'],
	runtimeApiNames: PreprocessResult['runtimeApiNames'],
): TransformJSXResult => {
	const elements: VariableDeclarator[] = [];

	const transformJsxResult: TransformJSXResult = {
		templateString: '',
		generatedDom: [nodes.variableDeclaration('const', elements)],
	};

	/**
	 *
	 *
	 *  @example
	 * ```typescript
	 * nodeStack.push(
	 *   Node,
	 *   ChildIndex, // index of current processed child of Node
	 *   ParentIdName, // name of Node parent Identifier
	 *   SiblingIdName, // name of Node sibling identifier
	 *   SiblingIndex, // index of Node sibling
	 * );
	 */
	const nodeStack: (JSXChild | number | string)[] = [];
	if (root.type === 'JSXElement') {
		nodeStack.push(root, -1, '_$TEMPLATE', '', 0);
	} else {
		const children = root.children;

		for (let childIndex = 0; childIndex < children.length; childIndex++) {
			nodeStack.push(children[childIndex], -1, '_$TEMPLATE', '', 0);
		}
	}

	/**
	 *  @example
	 * ```typescript
	 * const baseStackOffset = nodeStack.length - NodeStackFrame.Size;
	 * const node = nodeStack[baseStackOffset + NodeStackFrame.Node];
	 * const childIndex = nodeStack[baseStackOffset + NodeStackFrame.ChildIndex];
	 * ```
	 */

	const enum NodeStackFrame {
		/**
		 * Quantity of elements one stack frame occupies.
		 */
		Node,
		ChildIndex,
		ParentIdName,
		SiblingIdName,
		SiblingIndex,
		Size = 5,
	}

	/**
	 *
	 * Start index in {@link jsxInfos} of current processed node.
	 */
	let infoIndex = 0;

	while (nodeStack.length) {
		const baseStackOffset = nodeStack.length - NodeStackFrame.Size;
		const node = nodeStack[baseStackOffset + NodeStackFrame.Node] as JSXChild;
		const childIndex = nodeStack[baseStackOffset + NodeStackFrame.ChildIndex] as number;

		const parentIdName = nodeStack[
			baseStackOffset + NodeStackFrame.ParentIdName
		] as string;

		const siblingIdName = nodeStack[
			baseStackOffset + NodeStackFrame.SiblingIdName
		] as string;

		const siblingIndex = nodeStack[
			baseStackOffset + NodeStackFrame.SiblingIndex
		] as number;

		let nodeIdName = '';

		if (childIndex === -1) {
			if (node.type === 'JSXText') {
				transformJsxResult.templateString += trimJsxText(node.value);
			} else {
				const dynamicInfo = jsxInfos[infoIndex];

				if (dynamicInfo) {
					elements.push(
						nodes.variableDeclarator(
							nodes.identifier(nodeIdName),
							siblingIdName
								? generateSiblingPath(
										siblingIdName,
										childIndex -
											siblingIndex,
									)
								: generateChildPath(
										parentIdName,
										childIndex,
									),
						),
					);

					nodeIdName = generateUniqueIdentifier('_$el', identifiers);

					nodeStack[baseStackOffset + NodeStackFrame.SiblingIdName] =
						nodeIdName;

					nodeStack[baseStackOffset + NodeStackFrame.SiblingIndex] =
						nodeStack[
							baseStackOffset -
								NodeStackFrame.Size +
								NodeStackFrame.ChildIndex
						];

					if (dynamicInfo === JSXInfoType.Parent) {
						transformJsxResult.templateString +=
							'<' +
							(
								(node as JSXElement).openingElement
									.name as JSXIdentifier
							).name +
							' ' +
							generateLiteralAttributes(
								(node as JSXElement).openingElement
									.attributes,
							) +
							'>';
					} else if (dynamicInfo === JSXInfoType.AttributeElement) {
						infoIndex++;

						transformAttributes(
							jsxInfos[infoIndex] as AttributesInfo,
							nodeIdName,
							transformJsxResult,
							runtimeApiNames,
						);
					} else if (dynamicInfo === JSXInfoType.LiteralExpression) {
						transformJsxResult.templateString += (
							(node as JSXExpressionContainer)
								.expression as StringLiteral
						).value;
					} else {
						transformJsxResult.templateString +=
							ANCHOR_HTML_TAG;
					}
				}
			}

			infoIndex++;
		}

		// TODO: remove to top

		const children = (node as JSXElement).children as JSXChild[] | undefined;

		if (children && childIndex < children.length) {
			const newChildIndex = childIndex + 1;

			nodeStack[NodeStackFrame.ChildIndex] = newChildIndex;

			nodeStack.push(children[newChildIndex], -1, 0, nodeIdName, '');
		} else {
			if (children) {
				transformJsxResult.templateString +=
					'</' +
					((node as JSXElement).openingElement.name as JSXIdentifier)
						.name +
					'>';
			}

			nodeStack.pop();

			nodeStack.pop();
			nodeStack.pop();
			nodeStack.pop();
			nodeStack.pop();
		}
	}

	return transformJsxResult;
};

/**
 * #### Generates DOM operations and template string for `attributesInfo` and adds them to .
 *
 * @param attributesInfo {@link AttributesInfo} to generate from.
 * @param nodeIdName Name of identifier of node having `attributesInfo`.
 * @param transformJsxResult {@link TransformJsxResult} to be mutated with generated attributes.
 *
 *
 *
 * @param runtimeApiNames   {@link PreprocessResult.runtimeApiNames}.
 */

export const transformAttributes = (
	attributesInfo: AttributesInfo,
	nodeIdName: string,
	transformJsxResult: TransformJSXResult,
	runtimeApiNames: PreprocessResult['runtimeApiNames'],
): void => {
	const generatedDom = transformJsxResult.generatedDom;

	transformJsxResult.templateString += ' '; // a space not to break prev content
	for (
		let attrIndex = 0;
		attrIndex < attributesInfo.length;
		attrIndex += AttributeInfo.Size
	) {
		const exprType = attributesInfo[attrIndex + AttributeInfo.ExprType] as JSXExprType;
		const name = attributesInfo[attrIndex + AttributeInfo.Name] as string;
		const value = attributesInfo[attrIndex + AttributeInfo.Value] as Expression;

		if (!name) {
			// name absence means `JSXSpreadAttribute`
			generatedDom.push(
				nodes.expressionStatement(
					createMergeAttrsCall(
						runtimeApiNames.mergeAttrs,
						nodeIdName,

						nodes.resetNode(value),
					),
				),
			);
		} else if (exprType === JSXExprType.Literal) {
			transformJsxResult.templateString +=
				SPEC_ATTR_NAMES.get(name) ??
				name + '="' + (value as StringLiteral).value + '"';
		} else if (exprType === JSXExprType.Static) {
			generatedDom.push(
				nodes.expressionStatement(
					createAttrUpdate(nodeIdName, name, nodes.resetNode(value)),
				),
			);
		} else if (exprType === JSXExprType.Reactive) {
			generatedDom.push(
				nodes.expressionStatement(
					createEffectCall(
						runtimeApiNames.createEffect,
						nodes.arrowFunction(
							createAttrUpdate(
								nodeIdName,
								name,
								nodes.resetNode(value),
							),
						),
					),
				),
			);
		}
	}
};
/**
 *
 * #### Generates  HTML string  from  `attributes`.
 *
 * @param attributes Attributes ONLY with literals, for which {@link analyzeAttributes} returned `null`.
 *
 * @returns Generated HTML string. Attributes are without spaces aside (that is `'class='value'`).
 */
export const generateLiteralAttributes = (
	attributes: JSXElement['openingElement']['attributes'],
): string => {
	let generated: string = '';

	for (let attrIndex = 0; attrIndex < attributes.length; attrIndex++) {
		/**
		 * The attributes are always literals with names
		 * because of {@link analyzeAttributes}  function.
		 */
		const attribute = attributes[attrIndex] as JSXAttribute;

		const name = attribute.name.name as string;

		generated +=
			(SPEC_ATTR_NAMES.get(name) ?? name) +
			'="' +
			((attribute.value as JSXExpressionContainer).expression as StringLiteral)
				.value +
			'"';
	}

	return generated;
};

/**
 * @param mergeAttrsName Name of `mergeAttrs` from {@link PreprocessResult.runtimeApiNames}.
 * @param elIdName Name of identifier of `element` paramater from `mergeAttrs`.
 *
 * @param attributes `attributes` parameter from `mergeAttrs`.
 *
 * @returns `mergeAttrs` runtime function call.
 */
const createMergeAttrsCall = (
	mergeAttrsName: string,
	elIdName: string,
	attributes: Expression,
): CallExpression =>
	nodes.callExpression(
		nodes.identifier(mergeAttrsName),

		[nodes.identifier(elIdName), attributes],

		null,
	);

/**
 * @param elIdName Name of element identifier.
 * @param attrName Name of element attribute.
 * @param value Value to be assigned.
 *
 * @returns Assignment of `value` to element attribute.
 */
const createAttrUpdate = (
	elIdName: string,
	attrName: string,
	value: Expression,
): AssignmentExpression =>
	nodes.assignmentExpression(
		'=',
		nodes.memberExpression(nodes.identifier(elIdName), nodes.identifier(attrName)),
		value,
	);

/**
 * #### Generates DOM path from parent to child in AST nodes.
 *
 * @param parentName Identifier name of parent element. For example, `_$el`.
 * @param childIndex Index of place of the child in parent's children. Starts from `0`.
 *
 * @returns {Identifier | MemberExpression} {@link Identifier} with `parentName` if `elementIndex` is `0`. Otherwise returns `MemberExpression` with path from parent to child.
 *
 * @example
 *
 * ```tsx
 * <div>
 *   <h1> H </h1>
 *
 *   <p> P </p>
 * </div>
 *
 * generateChildPath('div', 2);
 *
 * // Output   (generated)
 * `div.firstChild.nextSibling`; // `<p> </p>`
 * ```
 *
 *
 */
export const generateChildPath = (
	parentName: string,
	childIndex: number,
): Identifier | MemberExpression => {
	let elementPath: Identifier | MemberExpression = nodes.memberExpression(
		nodes.identifier(parentName),

		nodes.identifier(FIRST_CHILD_ACCESS),
	);

	for (let pathIndex = 0; pathIndex < childIndex; pathIndex++) {
		elementPath = nodes.memberExpression(
			elementPath,
			nodes.identifier(NEXT_SIBLING_ACCESSOR),
		);
	}

	return elementPath;
};

/**
 * #### Generates DOM path from anchor to sibling in AST nodes.
 *
 * @param anchorName Identifier name of anchor element from which path is started. For example, `_$siblingEl`.
 * @param siblingIndex Distance to the sibling (`sibglingChildIndex - anchorChildIndex`) in DOM. Starts from `0`.
 *
 * @returns {Identifier | MemberExpression} {@link Identifier} with `anchorName` if the `siblingIndex` is `0`. Otherwise returns {@link MemberExpression} with DOM path from anchor to sibling.
 *
 *
 *
 * @example
 *
 * ```tsx
 * <div>
 *   <span>1</span>
 *
 *   <span>2</span>
 * </div>
 *
 * generateSiblingPath('span1', 1);
 * // Output (if generated via gen)
 * `span1.nextSibling`;
 * ```
 *
 *
 */
export const generateSiblingPath = (
	anchorName: string,
	siblingIndex: number,
): Identifier | MemberExpression => {
	let sibling: Identifier | MemberExpression = nodes.identifier(anchorName);

	for (let pathIndex = 0; pathIndex < siblingIndex; pathIndex++) {
		sibling = nodes.memberExpression(sibling, nodes.identifier('nextSibling'));
	}

	return sibling;
};

/**
 *
 * #### If the left or right side of `text` (before content) has line feed, trims this side of `text`.
 *
 * @param text JSX text to be trimmed.
 *
 * @returns Trimmed with JSX rules string.
 *
 * @example
 *
 * ```typescript
 * trimJsxText('  \n   abc      '); // 'abc      '
 * trimJsxText('      abc      \n'); // '      abc'
 * trimJsxTex('\n   abc   \n'); // 'abc'
 *
 * trimJsxText('   abc   '); // '   abc   '
 * trimJsxText('   \t   '); // '   \t   '
 * trimJsxText('   \n   '); // ''
 * ```
 *
 *
 *
 */

export const trimJsxText = (text: string): string => {
	const textLength = text.length;
	let hasNewLineStart: boolean = false;

	// TODO: add length bound check
	let startPos = 0;

	let startChar = text[startPos];

	while (
		startChar === ' ' ||
		startChar === '\n' ||
		startChar === '\r' ||
		startChar === '\t'
	) {
		if (startChar === '\n') {
			hasNewLineStart = true;
		}

		startPos++;

		startChar = text[startPos];
	}

	if (startPos === textLength) {
		return hasNewLineStart ? '' : text;
	}

	let hasNewLineEnd = false;

	let endPos = textLength - 1;

	let endChar = text[endPos];

	while (endChar === ' ' || endChar === '\n' || endChar === '\r' || endChar === '\t') {
		if (endChar === '\n') {
			hasNewLineEnd = true;
		}

		endPos--;

		endChar = text[endPos];
	}

	return text.slice(hasNewLineStart ? startPos : 0, hasNewLineEnd ? endPos + 1 : textLength);
};
