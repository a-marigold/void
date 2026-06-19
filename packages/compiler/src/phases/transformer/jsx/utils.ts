import type { ArrowFunctionExpression } from 'oxc-parser';

import type { UniqueId } from '../../preprocessor';
import * as nodes from '../nodes';

import type { ComponentChildren } from './types';

/**
 * @param body Body of function.
 * @param anchorParamName Name of `anchor` children function parameter (see the runtime type).
 *
 * @returns {ComponentChildren} {@link ComponentChildren}.
 */
export const createChildrenFn = (
	body: ArrowFunctionExpression['body'],
	anchorParamName: UniqueId,
): ComponentChildren => nodes.arrowFunction(body, [nodes.identifier(anchorParamName)]);
