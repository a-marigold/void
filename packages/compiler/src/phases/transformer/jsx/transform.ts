import type { DelegableEvent } from '@void/shared';
import type {
	CallExpression,
	MemberExpression,
	BlockStatement,
	AssignmentExpression,
	JSXFragment,
} from 'oxc-parser';

import type { CompileContext } from '../../../types';
import { generateUniqueId } from '../../preprocessor';
import type { PreprocessResult } from '../../preprocessor';
import * as nodes from '../nodes';
import type { TransformContext } from '../types';

import { analyzeJsx } from './analyze';
import { TEMPLATE_CONTENT_ACCESSOR, TEMPLATE_HTML_ACCESSOR } from './constants';
import { generateDom } from './generate';
import type { GenerateDOMResult, JSXParent } from './types';

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
 * @param root {@link JSXFragment} with children's JSX.
 * @param compileContext For {@link transformJsx}.
 * @param transformContext For {@link transformJsx}.
 * @param preprocessResult For {@link transformJsx}.
 *
 * @returns {GenerateDOMResult} {@link GenerateDOMResult} of children.
 */
export const transformComponentChildren = (
	children: JSXFragment,
	compileContext: CompileContext,
	transformContext: TransformContext,
	preprocessResult: PreprocessResult,
): GenerateDOMResult => {
	const idContext = preprocessResult.idContext;

	const runtimeApiNames = preprocessResult.runtimeApiNames;

	const templateContentIdName = generateUniqueId(idContext);

	const generateDomResult = generateDom(
		children,
		templateContentIdName,
		analyzeJsx(children, transformContext, compileContext, preprocessResult),
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

	return generateDomResult;
};

/**
 * #### Delegates (adds listener on document in `programBody`) every event from `delegableEvents` if it is not in `globalDelegatedEvents`.s
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
