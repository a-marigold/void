import { GenMapping, addSegment, toDecodedMap } from '@jridgewell/gen-mapping';
import type { VoidKeyword } from '@void/shared';

import { RUNTIME_TYPE_NAMES } from '../../constants';
import { createAbsPosCompileError, errorMessages, getIndexLoc, getLineIndexes } from '../../errors';
import type { CompileError } from '../../errors';
import { checkLowerCase } from '../../utils';

import {
	TRANSFORMED_REACTIVE_KEYWORD,
	TRANSFORMED_COMPONENT_KEYWORD,
	COMPONENT_START_KEYWORD,
	DECLARATION_KEYWORDS,
	TokenType,
	TokenCode,
} from './constants';
import { getNextToken, expectNextToken } from './tokens';
import type { Token, PreprocessContext, PreprocessResult } from './types';
import { generateUniqueId, getProps, generateImports, generateRuntimeApiNames } from './utils';
/**
 *
 *
 * #### Transforms `void-js` syntax into valid `jsx`.
 * #### Generates unique labels for `void-js` syntax (like `signal`) to identify it in transformer later.
 *
 * @param source String with `void-js` source code.
 *
 * @returns {PreprocessResult} {@link PreprocessResult}.
 *
 *
 *
 */

export const preprocess = (source: string): PreprocessResult => {
	/**
	 * {@link PreprocessResult.errors}.
	 */
	const errors: CompileError[] = [];

	/**
	 * Derived from {@link getLineIndexes} with {@link source}.
	 */
	const lineIndexes = getLineIndexes(source);

	/**
	 *
	 * Intermediate Representation for generating preprocessed code.
	 *
	 * Order of nodes:
	 * - `Base` (base order and order of signal, memo, effect):
	 *
	 *   - {@link IrNodeType} of node.
	 *   - Start pos in {@link source}.
	 *   - End pos in {@link source}.
	 *
	 * - `Component`:
	 *   - ...`Base`.
	 *   - Component Name string.
	 *   - Props string.
	 *
	 * - `RecoveredError`:
	 *   - ...`Base`.
	 *   - Replacement (string to replace error in source from Node start to end).
	 *
	 * @example
	 * ```typescript
	 * // `source`
	 * 'signal count = 16000; export <Button> () {}'
	 *
	 * ir.push(
	 *   IRNodeType.Signal, // Type of node
	 *   0, // Start of node in source
	 *   6, // End of node in source
	 * );
	 *
	 * ir.push(
	 *   IRNodeType.Component,
	 *   28,
	 *   46,
	 *   'Button',
	 *   '()',
	 * );
	 * ```
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
	const ir: (IrNodeType | number | string)[] = [];

	/**
	 * Variety of {@link ir} nodes.
	 */
	const enum IrNodeType {
		/**
		 *
		 * Includes arbitrary user typescript code from `IrNode` start to end positions.
		 */
		UserCode,
		Signal,
		Effect,
		Memo,
		Component,
		RecoveredError,
	}

	/**
	 * ```typescript
	 * const irType = ir[IrNodeOffset.IrNodeType];
	 * const nodeStart = ir[IrNodeOffset.Start];
	 * if(irType === IrNodeType.Component) {
	 *   const componentName = ir[IrNodeOffset.ComponentName];
	 * }
	 * ```
	 */
	const enum IrNodeOffset {
		IrType,
		Start,
		End,
		ComponentName = 3,
		ComponentProps = 4,
		RecoveredReplacement = 3,

		/**
		 * Quantity of {@link ir} elements base node (signal, memo, effect) occupies.
		 */
		BaseSize = 3,
		/**
		 * Quantity of {@link ir} elements {@link IrNodeType.Component} occupies.
		 */
		ComponentSize = 5,
		/**
		 * Quantity of {@link ir} elements {@link IrNodeType.RecoveredError} occupies.
		 */
		RecoveredSize = 4,
	}

	/**
	 * `Set` with all identifiers of `source`.
	 */
	const identifiers = new Set<string>();

	/**
	 *
	 * {@link context.currentToken}.
	 */

	const currentToken: Token = {
		type: TokenType.Start,

		value: '',
		start: 0,

		end: 0,
	};

	const context: PreprocessContext = {
		source,
		pos: 0,
		isRegExpAllowed: true,
		currentToken,
	};

	/**
	 * THe last start index of {@link IrNodeType.UserCode}.
	 */
	let lastUserCodeStart = 0;

	/**
	 * The last appeared {@link Token.value}.
	 */
	let lastTokenValue: Token['value'] = '';

	/**
	 * Used for {@link errorMessages.MULTIPLE_COMPONENTS}.
	 */
	let isComponentAppeared = false;

	while (currentToken.type !== TokenType.End) {
		getNextToken(context);

		const currentValue = currentToken.value;

		const currentStart = currentToken.start;

		if (currentToken.type === TokenType.Identifier) {
			if (lastTokenValue === '.') {
				lastTokenValue = currentValue;

				continue;
			}

			lastTokenValue = currentValue;

			if (currentValue !== COMPONENT_START_KEYWORD) {
				identifiers.add(currentValue);

				continue;
			}

			getNextToken(context);

			if (currentToken.value !== '<') {
				continue;
			}

			ir.push(IrNodeType.UserCode, lastUserCodeStart, currentStart);

			const nameCode = expectNextToken(
				context,
				lineIndexes,
				errors,
				TokenType.Identifier,
				null,
				errorMessages.IDENTIFIER_EXPECTED('component'),
			);

			const nameValue = currentToken.value;

			const nameStart = currentToken.start;
			const nameEnd = currentToken.end;

			if (nameCode === TokenCode.Missing) {
				ir.push(IrNodeType.RecoveredError, currentStart, nameEnd, '');

				lastUserCodeStart = nameEnd;

				break;
			}

			if (nameCode === TokenCode.Unexpected) {
				ir.push(
					IrNodeType.RecoveredError,
					currentStart,
					nameEnd,
					'function',
				);

				lastUserCodeStart = nameEnd;

				continue;
			}

			const closeSymbolCode = expectNextToken(
				context,
				lineIndexes,
				errors,

				TokenType.Punctuator,
				'>',
				errorMessages.TOKEN_EXPECTED('>'),
			);
			if (closeSymbolCode === TokenCode.Missing) {
				ir.push(IrNodeType.RecoveredError, currentStart, context.pos, '');

				lastUserCodeStart = context.pos;

				break;
			}

			if (
				expectNextToken(
					context,
					lineIndexes,
					errors,
					TokenType.Punctuator,
					'(',
					errorMessages.TOKEN_EXPECTED('('),
				)
			) {
				ir.push(IrNodeType.RecoveredError, currentStart, context.pos, '');

				lastUserCodeStart = context.pos;

				continue;
			}

			const propsStartSymbolStart = currentToken.start;

			const props = getProps(context, propsStartSymbolStart);

			const propsEnd = context.pos;

			ir.push(IrNodeType.Component, currentStart, propsEnd, nameValue, props);

			if (checkLowerCase(nameValue[0])) {
				errors.push(
					createAbsPosCompileError(
						errorMessages.COMPONENT_NAME_CAPTIALIZE,
						nameStart,
						nameEnd,
						lineIndexes,
					),
				);
			}

			if (isComponentAppeared) {
				errors.push(
					createAbsPosCompileError(
						errorMessages.MULTIPLE_COMPONENTS,
						nameStart,
						nameEnd,
						lineIndexes,
					),
				);
			}

			isComponentAppeared = true;

			lastUserCodeStart = propsEnd;

			continue;
		}
		if (currentToken.type === TokenType.VoidKeyword) {
			if (DECLARATION_KEYWORDS.has(lastTokenValue)) {
				errors.push(
					createAbsPosCompileError(
						errorMessages.KEYWORD_AS_VARIABLE_NAME(
							currentToken.value as VoidKeyword,
						),
						currentToken.start,
						currentToken.end,
						lineIndexes,
					),
				);

				continue;
			}

			// TODO: add checks on objects

			ir.push(
				IrNodeType.UserCode,
				lastUserCodeStart,
				currentStart,
				(currentValue as VoidKeyword) === 'signal'
					? IrNodeType.Signal
					: (currentValue as VoidKeyword) === 'effect'
						? IrNodeType.Effect
						: IrNodeType.Memo,
				currentStart,
				currentToken.end,
			);

			lastTokenValue = currentValue;

			lastUserCodeStart = currentToken.end;

			continue;
		}

		lastTokenValue = currentValue;
	}

	ir.push(IrNodeType.UserCode, lastUserCodeStart, source.length);

	const runtimeApiNames = generateRuntimeApiNames(identifiers);
	const signalLabel = generateUniqueId('_$8', identifiers);
	const effectLabel = generateUniqueId('_$9', identifiers);
	const memoLabel = generateUniqueId('_$a', identifiers);
	const componentLabel = generateUniqueId('_$b', identifiers);

	let code: string =
		generateImports(runtimeApiNames, RUNTIME_TYPE_NAMES, '___PATH___') +
		'let ' +
		signalLabel +
		',' +
		effectLabel +
		',' +
		memoLabel +
		',' +
		componentLabel +
		';';

	const genMapping = new GenMapping({ file: '___________SOURCE____________.vd' });

	// transformed labels for keywords to be concatinated in codegen

	const transformedSignal = ';' + signalLabel + ';' + TRANSFORMED_REACTIVE_KEYWORD + ' ';
	const transformedEffect = ';' + effectLabel + ';';
	const transformedMemo = ';' + memoLabel + ';' + TRANSFORMED_REACTIVE_KEYWORD + ' ';

	const transformedComponent =
		';' + componentLabel + ';export ' + TRANSFORMED_COMPONENT_KEYWORD + ' ';

	/**
	 *
	 *
	 *
	 *
	 *
	 *
	 *
	 * Last line in {@link source} appeared in codegen.
	 */

	let lastLine = 0;

	/**
	 * Column offset of {@link lastLine} in generated code.
	 */

	let lastColumnOffset = 0;

	let irIndex = 0;

	while (irIndex < ir.length) {
		const nodeType = ir[irIndex + IrNodeOffset.IrType] as IrNodeType;
		const nodeStart = ir[irIndex + IrNodeOffset.Start] as number;
		const nodeEnd = ir[irIndex + IrNodeOffset.End] as number;

		const nodeLoc = getIndexLoc(lineIndexes, nodeStart);

		/**
		 *
		 * {@link addSegment} has 0-based lines, so `- 1` is needed.
		 */

		const nodeLine = nodeLoc.line - 1;

		const nodeColumn = nodeLoc.column;

		let newOffset = 0;

		if (nodeType === IrNodeType.UserCode) {
			code += source.slice(nodeStart, nodeEnd);

			irIndex += IrNodeOffset.BaseSize;
		} else if (nodeType === IrNodeType.Signal) {
			code += transformedSignal;

			newOffset = transformedSignal.length;

			irIndex += IrNodeOffset.BaseSize;
		} else if (nodeType === IrNodeType.Memo) {
			code += transformedMemo;

			newOffset = transformedMemo.length;

			irIndex += IrNodeOffset.BaseSize;
		} else if (nodeType === IrNodeType.Effect) {
			code += transformedEffect;

			newOffset = transformedEffect.length;

			irIndex += IrNodeOffset.BaseSize;
		} else if (nodeType === IrNodeType.Component) {
			const name = ir[irIndex + IrNodeOffset.ComponentName];
			const props = ir[irIndex + IrNodeOffset.ComponentProps];

			const generatedComponent = transformedComponent + name + '=' + props + '=>';

			code += generatedComponent;

			newOffset = generatedComponent.length;

			irIndex += IrNodeOffset.ComponentSize;
		} else {
			const replacement = ir[
				irIndex + IrNodeOffset.RecoveredReplacement
			] as string;

			code += replacement;

			newOffset = replacement.length;

			irIndex += IrNodeOffset.RecoveredSize;
		}

		if (nodeLine === lastLine) {
			addSegment(
				genMapping,
				nodeLine,
				nodeColumn + lastColumnOffset,
				'__SOURCE__.vd',
				nodeLine,
				nodeColumn,
			);
			lastColumnOffset += newOffset;
		} else {
			addSegment(
				genMapping,
				nodeLine,
				nodeColumn,
				'__SOURCE__.vd',
				nodeLine,
				nodeColumn,
			);

			lastLine = nodeLine;
			lastColumnOffset = 0;
		}
	}

	return {
		code,

		sourceMap: toDecodedMap(genMapping),

		errors,

		labels: {
			[signalLabel]: 'signal',

			[effectLabel]: 'effect',

			[memoLabel]: 'memo',

			[componentLabel]: 'component',
		},

		identifiers,

		runtimeApiNames,
	};
};
