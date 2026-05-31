import type { BlockStatement, CallExpression } from 'oxc-parser';

import * as nodes from '../nodes';

/**
 *
 * @param iifeBody Body of IIFE.
 *
 * @returns Call of an arrow function (IIFE) with `iifeBody` as function body.
 */
export const createIifeCall = (iifeBody: BlockStatement['body']): CallExpression =>
	nodes.callExpression(nodes.arrowFunction(nodes.blockStatement(iifeBody)), [], null);
