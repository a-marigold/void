import type { DelegableEvent } from '@void/shared';
import type {
	CallExpression,
	MemberExpression,
	BlockStatement,
	AssignmentExpression,
	JSXElement,
	JSXIdentifier,
	JSXExpressionContainer,
	JSXChild,
	Expression,
	JSXText,
} from 'oxc-parser';

import { errorMessages } from '../../../errors';
import type { CompileContext } from '../../../types';
import { checkIsCapitalize } from '../../../utils';
import { generateUniqueId } from '../../preprocessor';
import type { PreprocessResult, UniqueId } from '../../preprocessor';
import * as nodes from '../nodes';
import type { TransformContext } from '../types';
import { createNodeCompileError } from '../utils';

import { analyzeExpr, analyzeJsx, transformProps } from './analyze';
import {
	JSXExprType,
	JSXInfoType,
	TEMPLATE_CONTENT_ACCESSOR,
	TEMPLATE_HTML_ACCESSOR,
} from './constants';
import { generateDom } from './generate';
import type { ElementPropFn, GenerateDOMResult, JSXParent, TransformChildrenResult } from './types';
import {
	createInsertCall,
	createReactiveInsertCall,
	createComponentInsertCall,
	createElementPropFn,
	createComponentInit,
	createReactiveExprInit,
} from './utils';

/**
 *
 * #### Generates DOM operations of `root` JSX element and adds them to `fnBody`.
 * #### Transforms other nodes (signals, memos, effects) inside as well as main transform does.
 * #### Adds `ReturnStatement` of root DOM element to `componentBody`, so the orig `ReturnStatement` of component MUST BE replaced with `EmptyStatement`.
 *
 * @param root Root JSX element.
 * @param componentBody Body of component.
 * @param compileContext {@link CompileContext} to check `globalDelegatedEvents`.
 * @param transformContext {@link TransformContext} for transforming nodes identically to main `transform`.
 * @param preprocessResult {@link PreprocessResult}.
 */
export const transformJsx = (
	root: JSXParent,
	componentBody: BlockStatement['body'],
	compileContext: CompileContext,
	transformContext: TransformContext,
	preprocessResult: PreprocessResult,
): void => {
	const idContext = preprocessResult.idContext;
	const runtimeApiNames = preprocessResult.runtimeApiNames;

	if (checkIsComponent(root)) {
		const name = (root.openingElement.name as JSXIdentifier).name;

		const childrenAnchorParamName = generateUniqueId(idContext);

		componentBody.push(
			nodes.returnStatement(
				createComponentInit(
					name,
					transformProps(
						root.openingElement.attributes,
						createElementPropFn(
							transformChildren(
								root.children,
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
					runtimeApiNames.createComponent,
				),
			),
		);
	} else {
		const templateContentIdName = generateUniqueId(idContext);

		const generateDomResult = generateDom(
			root,
			templateContentIdName,

			analyzeJsx(root, transformContext, compileContext, preprocessResult),

			idContext,
			runtimeApiNames,
		);

		const programBody = transformContext.programBody;

		const templateIdName = generateUniqueId(idContext);

		initTemplateContent(
			programBody,
			templateIdName,
			templateContentIdName,
			generateDomResult.templateHtml,
		);

		delegateEvents(
			generateDomResult.delegableEvents,
			compileContext.globalDelegatedEvents,
			programBody,
			runtimeApiNames,
		);
		const domOps = generateDomResult.domOps;
		for (let opIndex = 0; opIndex < domOps.length; opIndex++) {
			componentBody.push(domOps[opIndex]);
		}
		componentBody.push(
			nodes.returnStatement(nodes.identifier(generateDomResult.rootElIdName)),
		);
	}
};
/**
 * #### Generates DOM operations of `children`.
 * #### If there is only text, one expression or component in `children`, it does not create template.
 * #### Otherwise initializes `HTMLTemplateElement` and delegates events of generated DOM in `transformContext.programBody`.
 *
 * @param children Children of component's JSX element.
 * @param anchorIdName Name of identifier of anchor to insert children.
 * @param compileContext For {@link transformJsx}.
 * @param transformContext For {@link transformJsx}.
 * @param preprocessResult For {@link transformJsx}.
 *
 * @returns {TransformChildrenResult} {@link TransformChildrenResult}.
 */
export const transformChildren = (
	children: JSXElement['children'],
	anchorIdName: UniqueId,
	transformContext: TransformContext,
	compileContext: CompileContext,
	preprocessResult: PreprocessResult,
): TransformChildrenResult => {
	const idContext = preprocessResult.idContext;
	const runtimeApiNames = preprocessResult.runtimeApiNames;

	const singleChild = getSingleComponentChild(children);
	if (singleChild) {
		const singleChildType = singleChild.type;
		if (singleChildType === 'JSXElement') {
			const childrenAnchorParamName = generateUniqueId(idContext);

			const openingElement = singleChild.openingElement;
			return createComponentInsertCall(
				// getSingleComponentChild ensures it is JSXIdentifier
				(openingElement.name as JSXIdentifier).name,
				transformProps(
					openingElement.attributes,
					createElementPropFn(
						transformChildren(
							singleChild.children,
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
				anchorIdName,
				runtimeApiNames.createComponent,
				runtimeApiNames.insert,
			);
		} else if (singleChildType === 'JSXExpressionContainer') {
			const exprType = analyzeExpr(
				singleChild,
				transformContext,
				compileContext,
				preprocessResult,
			);

			if (exprType === JSXExprType.Empty) {
				transformContext.errors.push(
					createNodeCompileError(
						errorMessages.JSX_EMPTY_EXPRESSION,
						singleChild.start,
						singleChild.end,

						transformContext,
					),
				);
				// TODO: fail
			}

			if (exprType === JSXExprType.Static) {
				return createInsertCall(
					singleChild.expression as Expression,
					anchorIdName,
					runtimeApiNames.insert,
				);
			} else {
				const expr = singleChild.expression as Expression;

				const initNodeIdName = generateUniqueId(idContext);
				return nodes.blockStatement([
					createReactiveExprInit(
						initNodeIdName,
						expr,
						anchorIdName,
						runtimeApiNames.insert,
					),
					nodes.expressionStatement(
						createReactiveInsertCall(
							expr,
							initNodeIdName,
							runtimeApiNames.createEffect,
						),
					),
				]);
			}
		} else {
			return createInsertCall(
				nodes.literal(singleChild.value),
				anchorIdName,
				runtimeApiNames.insert,
			);
		}
	}

	const templateContentIdName = generateUniqueId(idContext);

	const childrenFragment = nodes.jsxFragment(children);

	const generateDomResult = generateDom(
		childrenFragment,
		templateContentIdName,
		analyzeJsx(childrenFragment, transformContext, compileContext, preprocessResult),
		idContext,
		runtimeApiNames,
	);

	const programBody = transformContext.programBody;

	const templateIdName = generateUniqueId(idContext);

	initTemplateContent(
		programBody,
		templateIdName,
		templateContentIdName,
		generateDomResult.templateHtml,
	);

	delegateEvents(
		generateDomResult.delegableEvents,
		compileContext.globalDelegatedEvents,
		programBody,
		runtimeApiNames,
	);

	const domOps = generateDomResult.domOps;

	domOps.push(
		nodes.expressionStatement(
			createInsertCall(
				nodes.identifier(generateDomResult.rootElIdName),
				anchorIdName,

				runtimeApiNames.insert,
			),
		),
	);

	return nodes.blockStatement(domOps);
};

/**
 * #### Used for `element` special props.
 * #### Initializes template in `transformContext.programBody`.
 * #### Does not delegate events inside.
 *
 * @param root Root JSX element of `element` prop.
 * @param transformContext {@link TransformContext}.
 * @param compileContext {@link CompileContext}.
 * @param preprocessResult {@link PreprocessResult}.
 *
 * @returns {ElementPropFn} {@link ElementPropFn}.
 */
export const transformElementProp = (
	root: JSXParent,
	transformContext: TransformContext,
	compileContext: CompileContext,
	preprocessResult: PreprocessResult,
): ElementPropFn => {
	const idContext = preprocessResult.idContext;
	const runtimeApiNames = preprocessResult.runtimeApiNames;

	const templateContentIdName = generateUniqueId(idContext);

	const generateDomResult = generateDom(
		root,
		templateContentIdName,

		analyzeJsx(root, transformContext, compileContext, preprocessResult),

		idContext,

		runtimeApiNames,
	);

	const templateIdName = generateUniqueId(idContext);

	initTemplateContent(
		transformContext.programBody,
		templateIdName,
		templateContentIdName,
		generateDomResult.templateHtml,
	);

	const domOps = generateDomResult.domOps;

	const anchorParamName = generateUniqueId(idContext);

	domOps.push(
		nodes.expressionStatement(
			createInsertCall(
				nodes.identifier(generateDomResult.rootElIdName),
				anchorParamName,
				runtimeApiNames.insert,
			),
		),
	);

	return createElementPropFn(nodes.blockStatement(domOps), anchorParamName);
};

/**
 *
 *
 * #### Creates variables of template (`HTMLTemplateElement`) and its `content` in `programBody`, sets `template.innerHTML` to `templateHtml`.
 *
 * @param programBody {@link TransformContext.programBody}.
 * @param templateIdName Name of identifier of template.
 * @param templateContentIdName Name of identifier of `template.content`.
 * @param templateHtml {@link GenerateDOMResult.templateHtml}.
 */

const initTemplateContent = (
	programBody: TransformContext['programBody'],
	templateIdName: UniqueId,
	templateContentIdName: UniqueId,
	templateHtml: string,
): void => {
	// Template initialization in the end of program,
	// 'cause template is not used immediatly
	programBody.push(
		nodes.variableDeclaration('const', [
			nodes.variableDeclarator(
				nodes.identifier(templateIdName),
				createTemplateInit(),
			),
			nodes.variableDeclarator(
				nodes.identifier(templateContentIdName),
				createTemplateContentAccess(templateIdName),
			),
		]),
		nodes.expressionStatement(createTemplateHtmlUpdate(templateIdName, templateHtml)),
	);
};
/**
 *
 * #### Checks is there only one JSX expression, non-empty text or component in `children`.
 * #### Ignores trailing empty {@link JSXInfoType.Text}.
 * #### Ingores nodes with errors.
 * #### Used not to create useless templates of single expressions, JSX text and components ('cause they have just a comment or text).
 *
 * @param children Children of component's JSX element.
 *
 * @returns Found JSX expression or component.
 *
 * @example
 * ```markdown
 * `\n\t<Counter/>\n\t` - returns the component.
 * `\n\t`{expr}` - returns the expression.
 * `<Counter/>` - returns the component.
 * ` Hello ` - returns the text.
 *
 * `<div></div>` - returns `null` 'cause it is a default HTML tag.
 * `\n\t Text {expr} Text` - returns `null` 'cause trailing text is not empty.
 * ```
 *
 */

export const getSingleComponentChild = (
	children: JSXElement['children'],
): JSXElement | JSXExpressionContainer | JSXText | null => {
	const childrenLength = children.length;

	let singleChild: ReturnType<typeof getSingleComponentChild> = null;

	for (let childIndex = 0; childIndex < childrenLength; childIndex++) {
		const child = children[childIndex];

		const childType = child.type;

		if (childType === 'JSXText') {
			// `trim` is faster than manual loop here
			if (child.value.trim()) {
				if (singleChild) {
					return null;
				}

				singleChild = child;
			}

			continue;
		}

		if (
			!singleChild &&
			(childType === 'JSXExpressionContainer' || checkIsComponent(child))
		) {
			singleChild = child;
			continue;
		}

		return null;
	}
	return singleChild;
};

/**
 * @param node {@link JSXChild}.
 *
 * @returns `true` if `node` is component and false if it is element.
 */
const checkIsComponent = (node: JSXChild): node is JSXElement => {
	if (node.type === 'JSXElement') {
		const name = (node.openingElement.name as JSXIdentifier).name as string | undefined;
		return Boolean(name) && checkIsCapitalize(name as string);
	}

	return false;
};
/**
 * #### Delegates (adds listener on document in `programBody`) every event from `delegableEvents` if it is not in `globalDelegatedEvents`.
 *
 *
 *
 * @param delegableEvents {@link GenerateDomResult.delegableEvents}.
 * @param globalDelegatedEvents {@link CompileContext.globalDelegatedEvents}.
 * @param programBody {@link TransformContext.programBody}.
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames}.
 */

const delegateEvents = (
	delegableEvents: GenerateDOMResult['delegableEvents'],
	globalDelegatedEvents: CompileContext['globalDelegatedEvents'],
	programBody: TransformContext['programBody'],
	runtimeApiNames: PreprocessResult['runtimeApiNames'],
): void => {
	for (let eventIndex = 0; eventIndex < delegableEvents.length; eventIndex++) {
		const event = delegableEvents[eventIndex];

		if (!globalDelegatedEvents.has(event)) {
			programBody.push(
				nodes.expressionStatement(
					createEventDelegation(event, runtimeApiNames),
				),
			);

			globalDelegatedEvents.add(event);
		}
	}
};

/**
 * @returns `const (templateIdName) = document.createElement('template');`.
 */
const createTemplateInit = (): CallExpression =>
	nodes.callExpression(
		nodes.memberExpression(
			nodes.identifier('document'),
			nodes.identifier('createElement'),
		),
		[nodes.literal('template')],
		null,
	);

/**
 * @param templateIdName Name of identifier of a `HTMLTemplateElement`.
 *
 *
 * @returns `content` property access of `templateIdName` - `(templateIdName).content`.
 */
const createTemplateContentAccess = (templateIdName: string): MemberExpression =>
	nodes.memberExpression(
		nodes.identifier(templateIdName),

		nodes.identifier(TEMPLATE_CONTENT_ACCESSOR),
	);

/**
 * @param templateIdName Name of template identifier (`HTMLTemplateElement`).
 * @param templateHtml String with HTML to be assigned to `innerHTML` of the template.
 *
 * @returns Assignment to `(templateIdName).innerHTML` with `templateHtml` - `(templateIdName).innerHTML = (templateHtml)`.
 */
const createTemplateHtmlUpdate = (
	templateIdName: string,

	templateHtml: string,
): AssignmentExpression =>
	nodes.assignmentExpression(
		'=',
		nodes.memberExpression(
			nodes.identifier(templateIdName),
			nodes.identifier(TEMPLATE_HTML_ACCESSOR),
		),

		nodes.literal(templateHtml),
	);

/**
 * @param eventPropName Key of delegable event property.
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames}.
 *
 * @returns `document.addEventListener(EventName, Handler);`.
 */
const createEventDelegation = (
	eventPropName: DelegableEvent,
	runtimeApiNames: PreprocessResult['runtimeApiNames'],
): CallExpression =>
	nodes.callExpression(
		nodes.memberExpression(
			nodes.identifier('document'),
			nodes.identifier('addEventListener'),
		),
		[
			nodes.literal(eventPropName.slice(1).toLowerCase()),

			nodes.identifier(
				runtimeApiNames[
					(eventPropName +
						'Handler') as keyof PreprocessResult['runtimeApiNames']
				],
			),
		],

		null,
	);
