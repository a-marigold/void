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
} from 'oxc-parser';

import type { CompileContext } from '../../../types';
import { checkLowerCase } from '../../../utils';
import { generateUniqueId } from '../../preprocessor';
import type { PreprocessResult } from '../../preprocessor';
import * as nodes from '../nodes';
import type { TransformContext } from '../types';

import { analyzeJsx } from './analyze';
import { JSXInfoType, TEMPLATE_CONTENT_ACCESSOR, TEMPLATE_HTML_ACCESSOR } from './constants';
import { generateDom } from './generate';
import type { ComponentChildren, GenerateDOMResult, JSXInfos, JSXParent } from './types';

// TODO: favors: transformJsx, transformComponentJsx, transformJsxExpr

/**
 * #### Generates DOM operations of `root` JSX element and adds them to `fnBody`.
 * #### Transforms other nodes (signals, memos, effects) inside as well as main transform does.
 * #### Adds `ReturnStatement` of root DOM element to `componentBody`, so the orig `ReturnStatement` of component MUST BE replaced with `EmptyStatement`.
 *
 * @param root Root JSX element.
 * @param componentBody Body of component.
 * @param compileContext {@link CompileContext} to check `globalDelegatedEvents`.
 * @param transformContext {@link TransformContext} for transforming nodes identically to main `transform`.
 * @param preprocessResult {@link PreprocessResult}.
 *
 *
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

	// Template initialization in the end of program,
	// because template is not used immediatly
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

		nodes.expressionStatement(
			createTemplateHtmlUpdate(templateIdName, generateDomResult.templateHtml),
		),
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
};

/**
 * #### Generates DOM operations of `root` JSX element.
 * #### Initializes `HTMLTemplateElement` and delegates events of generated DOM in `transformContext.programBody`.
 *
 * @param children Children of component's JSX element.
 * @param compileContext For {@link transformJsx}.
 * @param transformContext For {@link transformJsx}.
 * @param preprocessResult For {@link transformJsx}.
 *
 * @returns {GenerateDOMResult} {@link GenerateDOMResult} of children.
 */
export const transformChildren = (
	children: JSXElement['children'],
	compileContext: CompileContext,
	transformContext: TransformContext,
	preprocessResult: PreprocessResult,
): ComponentChildren => {
	const idContext = preprocessResult.idContext;

	const runtimeApiNames = preprocessResult.runtimeApiNames;
	const childrenFragment = nodes.jsxFragment(children);

	const jsxInfos = analyzeJsx(
		childrenFragment,
		transformContext,
		compileContext,
		preprocessResult,
	);

	const singleChild = getSingleComponentChild(children);

	if (singleChild.type === 'JSXElement') {
	}

	const templateContentIdName = generateUniqueId(idContext);

	const programBody = transformContext.programBody;

	const templateIdName = generateUniqueId(idContext);

	// Template initialization in the end of program,
	// because template is not used immediatly
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

		nodes.expressionStatement(
			createTemplateHtmlUpdate(templateIdName, generateDomResult.templateHtml),
		),
	);

	delegateEvents(
		generateDomResult.delegableEvents,
		compileContext.globalDelegatedEvents,
		programBody,

		runtimeApiNames,
	);
};

/**
 * #### Checks is there only one JSX expression or component in `children`.
 * #### Ignores trailing empty {@link JSXInfoType.Text}.
 *
 * @param children Children of component's JSX element.
 * @param jsxInfos {@link JSXInfos}.
 *
 * @returns Found JSX expression or component.
 *
 * @example
 * ```markdown
 * `\n\t<Counter/>\n\t` - returns the component.
 * `\n\t`{expr}` - returns the expression.
 * `<Counter/>` - returns the component.
 * `\n\t Text {expr} Text` - returns `null` 'cause text is not empty.
 * ```
 */

export const getSingleComponentChild = (
	children: JSXElement['children'],
): JSXElement | JSXExpressionContainer | null => {
	const childrenLength = children.length;

	if (childrenLength === 3) {
		const secondChild = children[1];

		if (
			secondChild.type === 'JSXExpressionContainer' ||
			checkIsComponent(secondChild)
		) {
			const firstChild = children[0];

			if (firstChild.type === 'JSXText' && !firstChild.value.trim()) {
				const thirdChild = children[2];
				if (thirdChild.type === 'JSXText' && !firstChild.value.trim()) {
					return secondChild;
				}
			}
		}
		return null;
	}

	if (childrenLength === 1) {
		const firstChild = children[0];

		if (firstChild.type === 'JSXExpressionContainer' || checkIsComponent(firstChild)) {
			return firstChild;
		}
		return null;
	}

	if (childrenLength === 2) {
		const firstChild = children[0];
		const secondChild = children[1];

		if (
			firstChild.type === 'JSXText' &&
			(secondChild.type === 'JSXExpressionContainer' ||
				checkIsComponent(secondChild))
		) {
			return secondChild;
		} else if (
			secondChild.type === 'JSXText' &&
			(firstChild.type === 'JSXExpressionContainer' ||
				checkIsComponent(firstChild))
		) {
			return firstChild;
		}
		return null;
	}

	return null;
};

/**
 *
 * @param node {@link JSXChild}.
 *
 * @returns `true` if `node` is component and false if it is element.
 */
const checkIsComponent = (node: JSXChild): node is JSXElement => {
	if (node.type === 'JSXElement') {
		const name = (node.openingElement.name as JSXIdentifier).name as string | undefined;

		return Boolean(name) && !checkLowerCase((name as string)[0]);
	}

	return false;
};

/**
 * #### Delegates (adds listener on document in `programBody`) every event from `delegableEvents` if it is not in `globalDelegatedEvents`.
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
 *
 *
 *
 *
 *
 * @returns `HTMLTemplateElement` initialization via `document.createElement`.
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
 *
 *
 *
 *
 *
 * @param templateIdName Name of identifier of a `HTMLTemplateElement`.
 *
 * @returns `content` property access of `templateIdName` - `(templateIdName).content`.
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
 *
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
