import type { DelegatedEventProp } from '@void/shared';
import type { CallExpression, MemberExpression, BlockStatement } from 'oxc-parser';

import type { CompileContext } from '../../../types';
import { generateUniqueId } from '../../preprocessor';
import type { PreprocessResult } from '../../preprocessor';
import * as nodes from '../nodes';
import type { TransformContext } from '../types';

import { analyzeJsx } from './analyze';
import { TEMPLATE_CONTENT_ACCESSOR } from './constants';
import { generateDom } from './generate';
import type { JSXParent } from './types';

/**
 * #### Generates DOM operations from `root` JSX element.
 * #### JSX in attributes and JSX expressions is transformed to IIFE as well as components transformed.
 * #### Transforms other nodes (signals, memos, effects) inside as well as main transform does.
 * #### Adds `ReturnStatement` of root DOM element to `componentBody`, so the orig `ReturnStatement` of component MUST BE replaced with `EmptyStatement`.
 *
 * @param root Root JSX element.
 * @param fnBody Body ({@link BlockStatement.body}) of a component or function that returns the `root`.
 * @param compileContext {@link CompileContext} to check `globalDelegatedEvents`.
 * @param transformContext {@link TransformContext} for transforming nodes identically to main `transform`.
 * @param preprocessResult {@link PreprocessResult}.
 *
 */
export const transformJsx = (
	root: JSXParent,
	fnBody: BlockStatement['body'],
	compileContext: CompileContext,
	transformContext: TransformContext,
	preprocessResult: PreprocessResult,
): void => {
	const identifiers = preprocessResult.identifiers;
	const runtimeApiNames = preprocessResult.runtimeApiNames;

	const templateContentIdName = generateUniqueId('_$tc', identifiers);

	const generatedDom = generateDom(
		root,
		templateContentIdName,
		analyzeJsx(root, transformContext, compileContext, preprocessResult),

		transformContext.visitedReactives,
		identifiers,
		runtimeApiNames,
	);

	const programBody = transformContext.programBody;

	const templateIdName = generateUniqueId('_$t', identifiers);

	// template initialization in the end of program,
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
	);

	const globalDelegatedEvents = compileContext.globalDelegatedEvents;

	const delegatedEvents = generatedDom.delegatedEvents;
	for (let eventIndex = 0; eventIndex < delegatedEvents.length; eventIndex++) {
		const eventPropName = delegatedEvents[eventIndex];

		if (!globalDelegatedEvents.has(eventPropName)) {
			programBody.push(
				nodes.expressionStatement(
					createEventDelegation(eventPropName, runtimeApiNames),
				),
			);
			globalDelegatedEvents.add(eventPropName);
		}
	}

	const domOps = generatedDom.domOps;
	for (let opIndex = 0; opIndex < domOps.length; opIndex++) {
		fnBody.push(domOps[opIndex]);
	}
	fnBody.push(nodes.returnStatement(nodes.identifier(generatedDom.rootElIdName)));
};

/**
 *
 *
 * #### Creates IIFE for JSX in expression (in attributes, JSX expressions).
 * #### Uses {@link transformJsxExpr} with the IIFE's body as `componentBody`.
 *
 * @param root Root of JSX from an expression.
 * @param programBody For {@link transformJsx}.
 * @param compileContext For {@link transformJsx}.
 * @param transformContext For {@link transformJsx}.
 * @param errorContext For {@link transformJsx}.
 * @param preprocessResult For {@link transformJsx}.
 *
 * @returns IIFE of `root` JSX element.
 */
export const transformJsxExpr = (
	root: JSXParent,
	compileContext: CompileContext,
	transformContext: TransformContext,
	preprocessResult: PreprocessResult,
): CallExpression => {
	const iifeBody: BlockStatement['body'] = [];

	transformJsx(root, iifeBody, compileContext, transformContext, preprocessResult);

	return nodes.callExpression(nodes.arrowFunction(nodes.blockStatement(iifeBody)), [], null);
};

/**
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
 * @param templateIdName Name of identifier of a `HTMLTemplateElement`.
 *
 * @returns `content` property access of `templateIdName` (`HTMLTemplateElement`).
 */

const createTemplateContentAccess = (templateIdName: string): MemberExpression =>
	nodes.memberExpression(
		nodes.identifier(templateIdName),

		nodes.identifier(TEMPLATE_CONTENT_ACCESSOR),
	);

const createEventDelegation = (
	eventPropName: DelegatedEventProp,
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
