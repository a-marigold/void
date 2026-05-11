import type { DelegableEvent, DelegatedEventProp } from '@void/shared';
import type {
	StringLiteral,
	IdentifierName as Identifier,
	Expression,
	MemberExpression,
	JSXElement,
	JSXIdentifier,
	JSXText,
	CallExpression,
	VariableDeclarator,
	JSXExpressionContainer,
	AssignmentExpression,
} from 'oxc-parser';

import type { PreprocessResult } from '../../preprocessor';
import { generateUniqueId } from '../../preprocessor';
import * as nodes from '../nodes';
import type { VisitedReactives } from '../types';
import { createSignalAssignment, createEffectCall } from '../utils';

import {
	ANCHOR_HTML_TAG,
	FIRST_CHILD_ACCESSOR,
	NEXT_SIBLING_ACCESSOR,
	JSXInfoType,
	AttrInfoType,
	AttrInfoOffset,
	SPEC_ATTR_NAMES,
	DATA_ATTR_SETTER_NAME,
	DELEGABLE_EVENTS,
} from './constants';
import type { GenerateDOMResult, JSXInfos, AttrsInfo, JSXParent, JSXChild } from './types';

/**
 *
 * #### Generates DOM operations from `root` by using `jsxInfos`.
 *
 * @param root Root JSX element to be transformed to DOM.
 * @param templateContentIdName Unique identifier name of `HTMLTemplateElement.prototype.content` with {@link GenerateDOMResult.templateContent} in `innerHTML`.
 * @param jsxInfos {@link JSXInfos} of `root`.
 * @param identifiers {@link PreprocessResult.identifiers}.
 * @param visitedReactives {@link VisitedReactives}.
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames}
 *
 *
 *
 *
 *
 *
 *
 * @returns {GenerateDOMResult} {@link GenerateDOMResult}.
 */

export const generateDom = (
	root: JSXParent,
	templateContentIdName: string,
	jsxInfos: JSXInfos,
	visitedReactives: VisitedReactives,
	identifiers: PreprocessResult['identifiers'],
	runtimeApiNames: PreprocessResult['runtimeApiNames'],
): GenerateDOMResult => {
	/**
	 * Name of parent identifier of   {@link root}.
	 */
	const rootParentIdName = generateUniqueId('_$el', identifiers);

	/**
	 * Variable declarators of DOM elements.
	 */
	const elements: VariableDeclarator[] = [
		nodes.variableDeclarator(
			nodes.identifier(rootParentIdName),
			createCloneNodeCall(templateContentIdName),
		),
	];

	const generateDomResult: GenerateDOMResult = {
		templateContent: '',
		domOps: [nodes.variableDeclaration('const', elements)],
		delegatedEvents: [],
	};

	/**
	 *
	 *
	 *  @example
	 * ```typescript
	 * nodeStack.push(
	 *   Node,
	 *   ChildIndex, // index of current child of Node. it is `-1` when Node is not processed
	 *   ParentIdName, // name of Node parent Identifier
	 *   SiblingIdName, // name of Node sibling identifier. can be empty
	 *   SiblingIndex, // index of Node sibling
	 * );
	 * ```
	 */

	const nodeStack: (JSXChild | number | string)[] = [];
	if (root.type === 'JSXElement') {
		nodeStack.push(root, -1, rootParentIdName, '', 0);
	} else {
		const children = root.children;

		for (let childIndex = 0; childIndex < children.length; childIndex++) {
			nodeStack.push(children[childIndex], -1, rootParentIdName, '', 0);
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
		Node,
		ChildIndex,
		ParentIdName,
		SiblingIdName,
		SiblingIndex,
		/**
		 * Quantity of elements one stack frame occupies.
		 */
		Size = 5,
	}

	/**
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
			const dynamicInfo = jsxInfos[infoIndex];

			if (dynamicInfo === JSXInfoType.Text) {
				generateDomResult.templateContent += trimJsxText(
					(node as unknown as JSXText).value,
				);
			} else if (dynamicInfo !== JSXInfoType.Error) {
				elements.push(
					nodes.variableDeclarator(
						nodes.identifier(nodeIdName),
						siblingIdName
							? generateSiblingPath(
									siblingIdName,
									childIndex - siblingIndex,
								)
							: generateChildPath(
									parentIdName,
									childIndex,
								),
					),
				);

				nodeIdName = generateUniqueId('_$el', identifiers);

				nodeStack[baseStackOffset + NodeStackFrame.SiblingIdName] =
					nodeIdName;
				nodeStack[baseStackOffset + NodeStackFrame.SiblingIndex] =
					nodeStack[
						baseStackOffset -
							NodeStackFrame.Size +
							NodeStackFrame.ChildIndex
					];

				if (dynamicInfo === JSXInfoType.Attrs) {
					infoIndex++;

					generateDomResult.templateContent +=
						'<' +
						(
							(node as JSXElement).openingElement
								.name as JSXIdentifier
						).name +
						' ';

					generateAttributes(
						jsxInfos[infoIndex] as AttrsInfo,
						nodeIdName,
						generateDomResult,
						visitedReactives,
						runtimeApiNames,
					);

					generateDomResult.templateContent += '>';
				} else if (dynamicInfo === JSXInfoType.LiteralExpression) {
					generateDomResult.templateContent += (
						(node as JSXExpressionContainer)
							.expression as StringLiteral
					).value;
				} else {
					generateDomResult.templateContent += ANCHOR_HTML_TAG;
				}
			}

			infoIndex++;
		}

		const children = (node as JSXElement).children as JSXChild[] | undefined;
		if (children && childIndex < children.length) {
			const newChildIndex = childIndex + 1;

			nodeStack[NodeStackFrame.ChildIndex] = newChildIndex;

			nodeStack.push(children[newChildIndex], -1, 0, nodeIdName, '');
		} else {
			if (children) {
				generateDomResult.templateContent +=
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

	return generateDomResult;
};

/**
 * #### Generates DOM operations and template string for `attributesInfo` and adds them to transformJsxResult.
 *
 *
 *
 *
 * @param attrsInfo {@link AttrsInfo} to generate from.
 * @param elIdName Name of identifier of node having `attributesInfo`.
 * @param generateDomResult {@link TransformJsxResult} to be mutated with generated attributes.
 * @param runtimeApiNames   {@link PreprocessResult.runtimeApiNames}.
 *
 */
export const generateAttributes = (
	attrsInfo: AttrsInfo,
	elIdName: string,
	generateDomResult: GenerateDOMResult,
	visitedReactives: VisitedReactives,
	runtimeApiNames: PreprocessResult['runtimeApiNames'],
): void => {
	const generatedDom = generateDomResult.domOps;
	const delegatedEvents = generateDomResult.delegatedEvents;

	for (let attrIndex = 0; attrIndex < attrsInfo.length; attrIndex += AttrInfoOffset.Size) {
		const infoType = attrsInfo[attrIndex + AttrInfoOffset.InfoType] as AttrInfoType;
		const name = attrsInfo[attrIndex + AttrInfoOffset.Name] as string;
		const value = attrsInfo[attrIndex + AttrInfoOffset.Value] as Expression;

		if (!name) {
			// name absence means `JSXSpreadAttribute`

			const spreadAttrUpdate = createSpreadAttrUpdate(
				runtimeApiNames.mergeAttrs,
				elIdName,

				nodes.resetNode(value),
			);
			generatedDom.push(
				nodes.expressionStatement(
					infoType === AttrInfoType.Static
						? spreadAttrUpdate
						: createEffectCall(
								nodes.arrowFunction(
									spreadAttrUpdate,
								),

								runtimeApiNames.createEffect,
							),
				),
			);
		} else if (infoType === AttrInfoType.Literal) {
			generateDomResult.templateContent +=
				(SPEC_ATTR_NAMES.get(name) ?? name + '="') +
				(value as StringLiteral).value +
				'"';
		} else if (infoType === AttrInfoType.Static || infoType === AttrInfoType.Reactive) {
			let attrUpdate:
				| ReturnType<typeof createPropAttrUpdate>
				| ReturnType<typeof createDataAttrUpdate>;

			if (name[0] + name[1] === 'on') {
				if (DELEGABLE_EVENTS.has(name as DelegableEvent)) {
					const delegatedEventName = ('$' +
						name.slice(2)) as DelegatedEventProp;

					delegatedEvents.push(delegatedEventName);
					attrUpdate = createPropAttrUpdate(
						elIdName,
						delegatedEventName,
						nodes.resetNode(value),
					);
				} else {
					attrUpdate = createPropAttrUpdate(
						elIdName,
						name.toLowerCase(),
						nodes.resetNode(value),
					);
				}
			} else if (name.includes('-')) {
				attrUpdate = createPropAttrUpdate(
					elIdName,

					name,

					nodes.resetNode(value),
				);
			} else {
				attrUpdate = createPropAttrUpdate(
					elIdName,
					name,
					nodes.resetNode(value),
				);
			}

			generatedDom.push(
				nodes.expressionStatement(
					infoType === AttrInfoType.Static
						? attrUpdate
						: createEffectCall(
								nodes.arrowFunction(attrUpdate),
								runtimeApiNames.createEffect,
							),
				),
			);
		} else {
			const refIdName = (value as Identifier).name;

			generatedDom.push(
				nodes.expressionStatement(
					infoType === AttrInfoType.StaticRef
						? nodes.assignmentExpression(
								'=',
								nodes.identifier(refIdName),
								nodes.identifier(elIdName),
							)
						: createSignalAssignment(
								'=',
								refIdName,
								nodes.resetNode(value),
								runtimeApiNames.setValue,
								visitedReactives,
							),
				),
			);
		}
	}
};

/**
 * #### Used for property attributes (e.g `className`, `htmlFor`).
 *
 * @param elIdName Name of element identifier.
 * @param attrName Name of attribute.
 * @param value Value to be assigned.
 *
 *
 * @returns Assignment of `value` to element attribute.
 */
const createPropAttrUpdate = (
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
 * #### Used for `data-*` and `aria-*` attributes.
 *
 * @param elIdName Name of identifier of element.
 * @param attrName Name of attribute.
 * @param value Value to be assigned.
 *
 * @returns Call of `HTMLElement.prototype.setAttribute` with `attrName` and `value`.
 */
const createDataAttrUpdate = (
	elIdName: string,
	attrName: string,
	value: Expression,
): CallExpression =>
	nodes.callExpression(
		nodes.memberExpression(
			nodes.identifier(elIdName),

			nodes.identifier(DATA_ATTR_SETTER_NAME),
		),
		[nodes.literal(attrName), value],
		null,
	);

/**
 * #### Used for spread attributes.
 *
 * @param mergeAttrsName Name of `mergeAttrs` from {@link PreprocessResult.runtimeApiNames}.
 * @param elIdName Name of identifier of element.
 * @param attributes `attributes` to be removed to element.
 *
 * @returns `mergeAttrs` runtime function call.
 */
const createSpreadAttrUpdate = (
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
 * @param templateContentIdName {@link GenerateDOMResult.templateContentIdName}.
 *
 * @returns deep copy call of template.content - `templateContent.cloneNode(true);`
 *
 *
 *
 *
 */

const createCloneNodeCall = (templateContentIdName: string): CallExpression =>
	nodes.callExpression(
		nodes.memberExpression(
			nodes.identifier(templateContentIdName),

			nodes.identifier('cloneNode'),
		),

		[
			// deep copy

			nodes.literal(true),
		],
		null,
	);

/**
 * #### Generates DOM path from parent to child in AST nodes.
 *
 * @param parentName Identifier name of parent element. For example, `_$el`.
 * @param childIndex Index of place of the child in parent's children. Starts from `0`.
 *
 * @returns {Identifier | MemberExpression} {@link Identifier} with `parentName` if `elementIndex` is `0`. Otherwise returns `MemberExpression` with path from parent to child.
 * @example
 *
 * ```tsx
 * <div>
 *        P
 *   <h1> H </h1>
 *   <p> PAR </p>
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

		nodes.identifier(FIRST_CHILD_ACCESSOR),
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
 *
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
