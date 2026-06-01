import type { CallExpression } from 'oxc-parser';

import * as nodes from '../nodes';

import type { IIFEBody } from './types';

/**
 *
 *
 * @param iifeBody Body of IIFE.
 *
 * @returns Call of an arrow function (IIFE) with `iifeBody` as function body.
 *
 */

export const createIifeCall = (iifeBody: IIFEBody): CallExpression =>
	nodes.callExpression(nodes.arrowFunction(nodes.blockStatement(iifeBody)), [], null);
