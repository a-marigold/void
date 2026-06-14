import type { DelegableEvent, DelegatedEventProp } from '@void/shared';
import type {
	NullLiteral,
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
	JSXFragment,
	BlockStatement,
} from 'oxc-parser';

import type { PreprocessResult, UniqueId } from '../../preprocessor';
import { generateUniqueId, CharCode } from '../../preprocessor';
import * as nodes from '../nodes';
import { createEffectInit } from '../utils';

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
	SELF_CLOSING_HTML_TAGS,
} from './constants';
import type {
	GenerateDOMResult,
	JSXInfos,
	AttrInfos,
	JSXParent,
	JSXChild,
	IIFEBody,
	ComponentProps,
} from './types';
import { createIife } from './utils';

/**
 *
 * #### Generates DOM operations from `root` by using `jsxInfos`.
 *
 * @param root Root JSX element to be transformed to DOM.
 * @param templateContentIdName Unique identifier name of `HTMLTemplateElement.prototype.content` with {@link GenerateDOMResult.templateHtml} in `innerHTML`.
 * @param jsxInfos {@link JSXInfos} of `root`.
 * @param identifiers {@link PreprocessResult.identifiers}.
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
	idContext: PreprocessResult['idContext'],
	runtimeApiNames: PreprocessResult['runtimeApiNames'],
): GenerateDOMResult => {
	/**
	 * Name of cloned template content identifier.
	 */
	const clonedTemplateIdName = generateUniqueId(idContext);

	/**
	 *
	 *
	 *
	 * Variable declarators of DOM elements.
	 */

	const elements: VariableDeclarator[] = [
		nodes.variableDeclarator(
			nodes.identifier(clonedTemplateIdName),

			createCloneNodeCall(templateContentIdName),
		),
	];

	const domOps: GenerateDOMResult['domOps'] = [nodes.variableDeclaration('const', elements)];

	/**
	 * Body of {@link generateDomResult.refCleanupFn} function.
	 */
	const refCleanupFnBody: BlockStatement['body'] = [];

	const generateDomResult: GenerateDOMResult = {
		templateHtml: '',
		domOps,
		refCleanupFn: nodes.arrowFunction(nodes.blockStatement(refCleanupFnBody)),
		delegableEvents: [],
	};

	/**
	 * Flag indicating is {@link root} `JSXElement` or not.
	 */

	const isRootJSXElement: boolean = root.type === 'JSXElement';

	/**
	 *  @example
	 * ```typescript
	 * nodeStack.push(
	 *   Node,
	 *   NodeIdName, // Name of Node's identifier (assigned lazily in loop below)
	 *   ChildIndex, // Index of current Node child. It is `-1` when Node is not processed
	 *   SiblingIdName, // Name of last Node's dynamic child idenitfier. It is '' when there dynamic child has not appeared
	 *   SiblingIndex, // Index of last Node's dynamic child
	 *   MergedTextCount, // Count of Text and Literal Expressions, appeared SINCE last Dynamic Expression, merged to one Text node
	 * );
	 * ```
	 *
	 *
	 *
	 *
	 */

	const nodeStack: (JSXChild | number | UniqueId)[] = isRootJSXElement
		? [root, '' as UniqueId, -1, '' as UniqueId, 0, 0]
		: [root, clonedTemplateIdName, -1, '' as UniqueId, 0, 0]; // when root is a fragment it is the cloned template

	/**
	 *  @example
	 * ```typescript
	 * const frameOffset = nodeStack.length - NodeStackFrame.Size;
	 * const node = nodeStack[frameOffset + NodeStackFrame.Node];
	 * const childIndex = nodeStack[frameOffset + NodeStackFrame.ChildIndex];
	 * ```
	 */

	const enum NodeStackFrame {
		Node,
		NodeIdName,
		ChildIndex,
		SiblingIdName,
		SiblingIndex,
		MergedTextCount,
		/**
		 * Quantity of elements one stack frame occupies.
		 */
		Size = 6,
	}

	/**
	 * Start index in {@link jsxInfos} of current node.
	 */
	let nodeInfoIndex: number = 0;

	while (nodeStack.length) {
		const frameOffset = nodeStack.length - NodeStackFrame.Size;

		const node = nodeStack[frameOffset + NodeStackFrame.Node] as JSXChild;

		const nodeChildIndex = nodeStack[frameOffset + NodeStackFrame.ChildIndex] as number;

		/**
		 * `true` when {@link node} is a child of {@link root},
		 * `false` when it is {@link root}.
		 */
		const isNodeNested = node !== root;

		let isComponent: boolean = false;

		/**
		 * Indicates is tag name of {@link node} in {@link SELF_CLOSING_HTML_TAGS} or not.
		 */
		let isSelfClosingHtmlTag: boolean = false;

		if (nodeChildIndex === -1 && (isRootJSXElement || isNodeNested)) {
			const parentFrameOffset = frameOffset - NodeStackFrame.Size;

			const infoType = jsxInfos[nodeInfoIndex];

			if (infoType === JSXInfoType.Text) {
				const trimmedText = trimJsxText((node as JSXText).value);
				if (trimmedText) {
					generateDomResult.templateHtml += trimmedText;

					(nodeStack[
						parentFrameOffset + NodeStackFrame.MergedTextCount
					] as number) += Number(
						jsxInfos[nodeInfoIndex - 1] ===
							JSXInfoType.LiteralExpression,
					);
				} else {
					(nodeStack[
						parentFrameOffset + NodeStackFrame.MergedTextCount
					] as number)++;
				}
			} else if (infoType === JSXInfoType.StaticParent) {
				nodeInfoIndex++;

				const attrInfos = jsxInfos[nodeInfoIndex] as AttrInfos;

				// `analyzeJsx` ensures it is `JSXIdentifier`
				const tagName = (
					(node as JSXElement).openingElement.name as JSXIdentifier
				).name;

				generateDomResult.templateHtml += '<' + tagName;

				if (attrInfos.length) {
					generateDomResult.templateHtml += ' ';

					// `StaticParent` has only literal attributes so `elIdName` argument is not needed
					generateAttrs(
						attrInfos,
						'',

						refCleanupFnBody,

						generateDomResult,

						runtimeApiNames,
					);
				}

				isSelfClosingHtmlTag = SELF_CLOSING_HTML_TAGS.has(tagName);

				generateDomResult.templateHtml += isSelfClosingHtmlTag ? '/>' : '>';
			} else if (infoType === JSXInfoType.LiteralExpression) {
				generateDomResult.templateHtml += (
					(node as JSXExpressionContainer).expression as StringLiteral
				).value;

				const prevNodeInfoType = jsxInfos[nodeInfoIndex - 1];

				(nodeStack[
					parentFrameOffset + NodeStackFrame.MergedTextCount
				] as number) += Number(
					prevNodeInfoType === JSXInfoType.Text ||
						prevNodeInfoType === JSXInfoType.LiteralExpression,
				);
			} else if (infoType === JSXInfoType.Error) {
				// TODO: throw errors away
			} else {
				const nodeIdName = generateUniqueId(idContext);
				nodeStack[frameOffset + NodeStackFrame.NodeIdName] = nodeIdName;

				// Root nodes do not have parents so their properties are like that:
				let parentIdName = clonedTemplateIdName;
				let parentChildIndex = 0;
				let siblingIdName = '';
				let siblingIndex = 0;
				let skippedCount = 0;

				if (isNodeNested) {
					parentIdName = nodeStack[
						parentFrameOffset + NodeStackFrame.NodeIdName
					] as UniqueId;
					parentChildIndex = nodeStack[
						parentFrameOffset + NodeStackFrame.ChildIndex
					] as number;
					siblingIdName = nodeStack[
						parentFrameOffset + NodeStackFrame.SiblingIdName
					] as string;
					siblingIndex = nodeStack[
						parentFrameOffset + NodeStackFrame.SiblingIndex
					] as number;
					skippedCount = nodeStack[
						parentFrameOffset + NodeStackFrame.MergedTextCount
					] as number;

					nodeStack[
						parentFrameOffset + NodeStackFrame.SiblingIdName
					] = nodeIdName;
					nodeStack[parentFrameOffset + NodeStackFrame.SiblingIndex] =
						parentChildIndex;
					nodeStack[
						parentFrameOffset + NodeStackFrame.MergedTextCount
					] = 0;
				}

				elements.push(
					nodes.variableDeclarator(
						nodes.identifier(nodeIdName),
						siblingIdName
							? generateSiblingPath(
									siblingIdName,
									parentChildIndex -
										siblingIndex -
										skippedCount,
								)
							: generateChildPath(
									parentIdName,
									parentChildIndex -
										skippedCount,
								),
					),
				);

				if (infoType === JSXInfoType.DynamicParent) {
					nodeInfoIndex++;

					const attrInfos = jsxInfos[nodeInfoIndex] as AttrInfos;

					// `analyzeJsx` ensures it is `JSXIdentifier`
					const tagName = (
						(node as JSXElement).openingElement
							.name as JSXIdentifier
					).name;

					generateDomResult.templateHtml += '<' + tagName;

					if (attrInfos.length) {
						generateDomResult.templateHtml += ' ';

						generateAttrs(
							attrInfos,
							nodeIdName,

							refCleanupFnBody,
							generateDomResult,
							runtimeApiNames,
						);
					}

					isSelfClosingHtmlTag = SELF_CLOSING_HTML_TAGS.has(tagName);

					generateDomResult.templateHtml += isSelfClosingHtmlTag
						? '/>'
						: '>';
				} else if (infoType === JSXInfoType.StaticExpression) {
					generateDomResult.templateHtml += ANCHOR_HTML_TAG;
					domOps.push(
						nodes.expressionStatement(
							createInsertCall(
								nodes.resetNode(
									(
										node as JSXExpressionContainer
									)
										// `analyzeJsx` ensures it is not `JSXEmptyExpression`
										.expression as Expression,
								),
								nodeIdName,
								nodes.literal<NullLiteral>(null),
								runtimeApiNames.insert,
							),
						),
					);
				} else if (infoType === JSXInfoType.ReactiveExpression) {
					generateDomResult.templateHtml += ANCHOR_HTML_TAG;

					const prevExprIdName = generateUniqueId(idContext);

					domOps.push(
						nodes.variableDeclaration('let', [
							nodes.variableDeclarator(
								nodes.identifier(prevExprIdName),
								nodes.literal(null),
							),
						]),

						nodes.expressionStatement(
							createReactiveInsertCall(
								nodes.resetNode(
									(
										node as JSXExpressionContainer
									)
										// `analyzeJsx` ensures it is not `JSXEmptyExpression`
										.expression as Expression,
								),
								nodeIdName,

								prevExprIdName,

								runtimeApiNames.insert,

								runtimeApiNames.createEffect,
							),
						),
					);
				} else {
					nodeInfoIndex++;
					const childrenIifeBody = jsxInfos[
						nodeInfoIndex
					] as IIFEBody;
					nodeInfoIndex++;

					domOps.push(
						nodes.expressionStatement(
							createComponentInsertCall(
								childrenIifeBody,
								jsxInfos[
									nodeInfoIndex
								] as ComponentProps,
								nodeIdName,
								runtimeApiNames.createComponent,
								runtimeApiNames.insert,
							),
						),
					);

					generateDomResult.templateHtml += ANCHOR_HTML_TAG;

					isComponent = true;
				}
			}

			nodeInfoIndex++;
		}

		const children = (node as JSXElement | JSXFragment).children as
			| JSXChild[]
			| undefined;
		if (children && !isComponent && !isSelfClosingHtmlTag) {
			const newChildIndex = nodeChildIndex + 1;

			if (newChildIndex < children.length) {
				nodeStack[frameOffset + NodeStackFrame.ChildIndex] = newChildIndex;

				nodeStack.push(
					children[newChildIndex],
					'' as UniqueId,
					-1,
					'' as UniqueId,
					0,
					0,
				);

				continue;
			} else if (isRootJSXElement || isNodeNested) {
				// `analyzeJsx` ensures it is `JSXIdentifier`

				generateDomResult.templateHtml +=
					'</' +
					((node as JSXElement).openingElement.name as JSXIdentifier)
						.name +
					'>';
			}
		}

		// It is faster than `nodeStack.length -= Size`

		nodeStack.pop();
		nodeStack.pop();
		nodeStack.pop();
		nodeStack.pop();
		nodeStack.pop();
		nodeStack.pop();
	}

	domOps.push(nodes.returnStatement(nodes.identifier(clonedTemplateIdName)));

	return generateDomResult;
};

/**
 *
 *
 *
 *
 * #### Generates DOM operations and template string for `attributesInfo` and adds them to transformJsxResult.
 *
 * @param attrInfos {@link AttrInfos} to generate from.
 * @param elIdName Name of identifier of node having `attributesInfo`.
 * @param refCleanupFnBody Body of {@link GenerateDOMResult.refCleanupFn} function.
 * @param generateDomResult {@link TransformJsxResult} to be mutated with generated attributes.
 * @param runtimeApiNames   {@link PreprocessResult.runtimeApiNames}.
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
 *
 *
 *
 *
 */

export const generateAttrs = (
	attrInfos: AttrInfos,
	elIdName: string,
	refCleanupFnBody: BlockStatement['body'],
	generateDomResult: GenerateDOMResult,
	runtimeApiNames: PreprocessResult['runtimeApiNames'],
): void => {
	const domOps = generateDomResult.domOps;
	const delegatedEvents = generateDomResult.delegableEvents;

	for (let attrIndex = 0; attrIndex < attrInfos.length; attrIndex += AttrInfoOffset.Size) {
		const infoType = attrInfos[attrIndex + AttrInfoOffset.InfoType] as AttrInfoType;
		const name = attrInfos[attrIndex + AttrInfoOffset.Name] as string;
		const value = attrInfos[attrIndex + AttrInfoOffset.Value] as Expression;

		if (!name) {
			// Name absence means `JSXSpreadAttribute`
			const spreadAttrUpdate = createSpreadAttrUpdate(
				runtimeApiNames.mergeAttrs,
				elIdName,
				nodes.resetNode(value),
			);

			domOps.push(
				nodes.expressionStatement(
					infoType === AttrInfoType.Static
						? spreadAttrUpdate
						: createEffectInit(
								nodes.arrowFunction(
									spreadAttrUpdate,
								),

								runtimeApiNames.createEffect,
							),
				),
			);
		} else if (infoType === AttrInfoType.Literal) {
			generateDomResult.templateHtml +=
				(SPEC_ATTR_NAMES.get(name) ?? name) +
				'="' +
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

			domOps.push(
				nodes.expressionStatement(
					infoType === AttrInfoType.Static
						? attrUpdate
						: createEffectInit(
								nodes.arrowFunction(attrUpdate),
								runtimeApiNames.createEffect,
							),
				),
			);
		} else if (infoType === AttrInfoType.DefaultRef) {
			const refIdName = (value as Identifier).name;

			domOps.push(
				nodes.expressionStatement(
					createRefUpdate(refIdName, nodes.identifier(elIdName)),
				),
			);

			refCleanupFnBody.push(
				nodes.expressionStatement(
					createRefUpdate(
						refIdName,
						nodes.literal<NullLiteral>(null),
					),
				),
			);
		} else {
			const propRefIdName = (value as Identifier).name;

			domOps.push(
				nodes.expressionStatement(
					nodes.callExpression(
						nodes.identifier(propRefIdName),
						[nodes.identifier(elIdName)],
						null,
					),
				),
			);

			refCleanupFnBody.push(
				nodes.expressionStatement(
					nodes.callExpression(
						nodes.identifier(propRefIdName),
						[nodes.literal(null)],
						null,
					),
				),
			);
		}
	}
};

/**
 * @param templateContentIdName {@link GenerateDOMResult.templateContentIdName}.
 *
 * @returns Deep copy call of template.content - `(templateContentIdName).cloneNode(true);`
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
 * #### Used for property attributes (e.g `className`, `htmlFor`).
 *
 *
 * @param elIdName Name of element identifier.
 * @param attrName Name of attribute.
 * @param value Value to be assigned.
 *
 *
 * @returns Assignment of `value` to element attribute.
 *
 *
 *
 *
 *
 *
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
 * @param refIdName Name of identifier of `ref` attribute value.
 * @param value Identifier of element to be assigned to ref or null literal.
 *
 * @returns Assignment of `value` to `refIdName` - `refIdName = (value);`
 *
 *
 */
const createRefUpdate = (
	refIdName: string,
	value: Identifier | NullLiteral,
): AssignmentExpression => nodes.assignmentExpression('=', nodes.identifier(refIdName), value);
/**
 * @param expr Expression for first argument of `insert`.
 * @param anchorIdName Name of identifier `anchor` argument of `insert`.
 * @param exprScope `exprScope` argument of `insert` runtime function.
 * @param insertName `insert` of {@link PreprocessResult.runtimeApiNames}
 *
 *
 *
 *
 *
 *
 * @returns Call of `insert` - `insert(expr, anchorIdName, prevExprNode)`.
 */
const createInsertCall = (
	expr: Expression,
	anchorIdName: string,
	exprScope: Identifier | NullLiteral,
	insertName: string,
): CallExpression =>
	nodes.callExpression(
		nodes.identifier(insertName),

		[expr, nodes.identifier(anchorIdName), exprScope],
		null,
	);

/**
 *
 *
 * @param childrenIifeBody Body of IIFE of component children.
 * @param anchorIdName For {@link createInsertCall}.
 * @param createComponentName Name of `createComponent` runtime function.
 * @param insertName For {@link createInsertCall}.
 *
 * @returns `insert(createComponent((() => (childrenIifeBody))()), (anchorIdName), null);`.
 */
const createComponentInsertCall = (
	childrenIifeBody: IIFEBody,
	props: ComponentProps,
	anchorIdName: string,
	createComponentName: string,
	insertName: string,
): CallExpression =>
	createInsertCall(
		nodes.callExpression(
			nodes.identifier(createComponentName),
			[createIife(childrenIifeBody), nodes.objectExpression(props)],
			null,
		),
		anchorIdName,
		nodes.literal<NullLiteral>(null),
		insertName,
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
 *
 *
 *
 *
 *
 *
 * @returns Call of `createEffect` with insertion - `createEffect(() => prevExprIdName = insert(expr,anchorIdName,prevExprIdName))`
 */

const createReactiveInsertCall = (
	expr: Expression,
	anchorIdName: string,
	prevExprIdName: string,
	insertName: string,
	createEffectName: string,
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
		),

		createEffectName,
	);

/**
 *
 *
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
 *
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
 */

export const trimJsxText = (text: string): string => {
	const textLength = text.length;

	let hasNewLineStart: boolean = false;

	let startPos = 0;

	let startCharCode = text.charCodeAt(startPos);

	while (
		startCharCode === CharCode.Space ||
		startCharCode === CharCode['\n'] ||
		startCharCode === CharCode['\t'] ||
		startCharCode === CharCode['\r']
	) {
		if (startCharCode === CharCode['\n']) {
			hasNewLineStart = true;
		}

		startPos++;

		if (startPos === textLength) {
			break;
		}

		startCharCode = text.charCodeAt(startPos);
	}

	if (startPos === textLength) {
		return hasNewLineStart ? '' : text;
	}

	let hasNewLineEnd = false;

	let endPos = textLength - 1;

	let endCharCode = text.charCodeAt(endPos);

	while (
		endCharCode === CharCode.Space ||
		endCharCode === CharCode['\n'] ||
		endCharCode === CharCode['\r'] ||
		endCharCode === CharCode['\t']
	) {
		if (endCharCode === CharCode['\n']) {
			hasNewLineEnd = true;
		}

		endPos--;
		endCharCode = text.charCodeAt(endPos);
	}

	return text.slice(hasNewLineStart ? startPos : 0, hasNewLineEnd ? endPos + 1 : textLength);
};
