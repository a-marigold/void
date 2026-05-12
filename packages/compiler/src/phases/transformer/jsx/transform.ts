import type { DelegatedEventProp } from '@void/shared';
import type { Program, CallExpression, MemberExpression, BlockStatement } from 'oxc-parser';

import type { CompileContext } from '../../../types';
import { generateUniqueId } from '../../preprocessor';
import type { PreprocessResult } from '../../preprocessor';
import * as nodes from '../nodes';
import type { TransformContext, ErrorContext } from '../types';

import { analyzeJsx } from './analyze';
import { TEMPLATE_CONTENT_ACCESSOR } from './constants';
import { generateDom } from './generate';
import type { JSXParent } from './types';

/**
 * #### Analyzes `root` JSX element an then generates DOM operations via {@link analyzeJsx} and {@link generateDom}.
 * #### JSX in attributes and JSX expressions is transformed to IIFE as well as components transformed.
 * #### Transforms other nodes (signals, memos, effects) inside as well as main transform does.
 *
 * @param root Root JSX element.
 * @param programBody Body of the program to insert init of `HTMLTemplateElement` of JSX to it.
 * @param compileContext {@link CompileContext} to check `globalDelegatedEvents`.
 * @param transformContext {@link TransformContext} for transforming nodes identically to main transform.
 * @param errorContext {@link errorContext}.
 * @param preprocessResult {@link PreprocessResult}.
 *
 */
export const transformJsx = (
	root: JSXParent,
	programBody: Program['body'],
	compileContext: CompileContext,
	transformContext: TransformContext,
	errorContext: ErrorContext,
	preprocessResult: PreprocessResult,
) => {
	const identifiers = preprocessResult.identifiers;
	const runtimeApiNames = preprocessResult.runtimeApiNames;

	const templateContentIdName = generateUniqueId('_$tc', identifiers);

	const generatedDom = generateDom(
		root,
		templateContentIdName,
		analyzeJsx(
			root,
			transformContext,
			errorContext,
			programBody,
			compileContext,
			preprocessResult,
		),
		transformContext.visitedReactives,
		identifiers,
		runtimeApiNames,
	);

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
	programBody: Program['body'],
	compileContext: CompileContext,
	transformContext: TransformContext,
	errorContext: ErrorContext,
	preprocessResult: PreprocessResult,
): CallExpression => {
	const iifeBody: BlockStatement['body'] = [];

	transformJsx(
		root,
		programBody,
		compileContext,
		transformContext,
		errorContext,
		preprocessResult,
	);

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
