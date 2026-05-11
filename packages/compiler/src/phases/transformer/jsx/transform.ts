import type { Program, CallExpression, MemberExpression, ImportDeclaration } from 'oxc-parser';

import { generateUniqueId } from '../../preprocessor';
import type { PreprocessResult } from '../../preprocessor';
import * as nodes from '../nodes';
import type { TransformContext, ErrorContext, VisitedReactives } from '../types';

import { analyzeJsx } from './analyze';
import { TEMPLATE_CONTENT_ACCESSOR } from './constants';
import { generateDom } from './generate';
import type { JSXParent } from './types';

export const transformJsx = (
	root: JSXParent,
	programBody: Program['body'],
	transformContext: TransformContext,
	errorContext: ErrorContext,
	visitedReactives: VisitedReactives,
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
			preprocessResult.labels,
			runtimeApiNames,
		),

		visitedReactives,
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

	// the first statement in preprocessed code is always `ImportDeclaration`
	programBody[0] as ImportDeclaration;
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
