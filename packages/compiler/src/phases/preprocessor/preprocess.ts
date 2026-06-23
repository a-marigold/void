import { GenMapping, addSegment, toDecodedMap } from '@jridgewell/gen-mapping';
import type { VoidKeyword } from '@void/shared';

import { RUNTIME_TYPE_NAMES } from '../../constants';
import { createAbsPosCompileError, errorMessages, getIndexLoc, getLineIndexes } from '../../errors';
import type { CompileError } from '../../errors';
import { checkIsCapitalize } from '../../utils';

import {
	TRANSFORMED_REACTIVE_KEYWORD,
	TRANSFORMED_COMPONENT_KEYWORD,
	COMPONENT_START_KEYWORD,
	DECLARATION_KEYWORDS,
	TokenType,
	TokenCode,
	IrNodeType,
	IrNodeOffset,
	COMPONENT_BLOCK_START,
	PROPS_PLACEHOLDER,
} from './constants';
import { getNextToken, expectNextToken } from './tokens';
import type { Token, TokenContext, PreprocessResult, PreprocessIR } from './types';
import { generateUniqueId, parseProps, generateImports, generateRuntimeApiNames } from './utils';

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
	 * {@link PreprocessIR}.
	 */

	const ir: PreprocessIR = [];

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

	const context: TokenContext = {
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

			// TODO: move the error to transform phase
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

			lastTokenValue = currentValue;

			if ((currentValue as VoidKeyword) === 'signal') {
				ir.push(
					IrNodeType.UserCode,
					lastUserCodeStart,
					currentStart,

					IrNodeType.Signal,
					currentStart,
					currentToken.end,
				);
				lastUserCodeStart = currentToken.end;
				continue;
			} else if ((currentValue as VoidKeyword) === 'effect') {
				ir.push(
					IrNodeType.UserCode,
					lastUserCodeStart,
					currentStart,

					IrNodeType.Effect,
					currentStart,
					currentToken.end,
				);
				lastUserCodeStart = currentToken.end;
				continue;
			} else if ((currentValue as VoidKeyword) === 'memo') {
				ir.push(
					IrNodeType.UserCode,
					lastUserCodeStart,
					currentStart,

					IrNodeType.Memo,
					currentStart,
					currentToken.end,
				);
				lastUserCodeStart = currentToken.end;
				continue;
			}

			if (currentValue !== COMPONENT_START_KEYWORD) {
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
			const closeSymbolEnd = context.pos;

			if (closeSymbolCode === TokenCode.Missing) {
				ir.push(
					IrNodeType.RecoveredError,
					currentStart,
					closeSymbolEnd,
					'',
				);
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

			ir.push(IrNodeType.Component, currentStart, closeSymbolEnd, nameValue);

			const propsSymbolStart = currentToken.start;
			parseProps(propsSymbolStart, ir, context);
			const propsEnd = context.pos;

			if (
				expectNextToken(
					context,
					lineIndexes,
					errors,
					TokenType.Punctuator,
					'{',
					errorMessages.TOKEN_EXPECTED('{'),
				)
			) {
				ir.push(
					IrNodeType.RecoveredError,
					currentStart,
					closeSymbolEnd,
					'',
				);

				lastUserCodeStart = closeSymbolEnd;

				continue;
			}
			const componentBlockStart = context.pos;

			ir.push(
				IrNodeType.ComponentBlockStart,
				propsEnd,
				propsEnd + COMPONENT_BLOCK_START.length,

				IrNodeType.PropsPlaceholder,
				componentBlockStart,
				componentBlockStart,
			);

			if (!checkIsCapitalize(nameValue)) {
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

		lastTokenValue = currentValue;
	}

	ir.push(IrNodeType.UserCode, lastUserCodeStart, source.length);

	const idContext: PreprocessResult['idContext'] = { uniqueIdCount: 0 };

	const runtimeApiNames = generateRuntimeApiNames(idContext);
	const signalLabel = generateUniqueId(idContext);
	const effectLabel = generateUniqueId(idContext);
	const memoLabel = generateUniqueId(idContext);
	const componentLabel = generateUniqueId(idContext);
	const propsSignalLabel = generateUniqueId(idContext);
	const propsMemoLabel = generateUniqueId(idContext);
	const propsRefLabel = generateUniqueId(idContext);

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
		const irType = ir[irIndex + IrNodeOffset.IrType] as IrNodeType;
		const nodeStart = ir[irIndex + IrNodeOffset.Start] as number;
		const nodeEnd = ir[irIndex + IrNodeOffset.End] as number;

		const nodeLoc = getIndexLoc(nodeStart, lineIndexes);

		/**
		 *
		 *
		 *
		 * {@link addSegment} has 0-based lines, so `- 1` is needed.
		 */

		const nodeLine = nodeLoc.line - 1;

		const nodeColumn = nodeLoc.column;

		let newOffset = 0;

		if (irType === IrNodeType.UserCode) {
			code += source.slice(nodeStart, nodeEnd);

			irIndex += IrNodeOffset.BaseSize;
		} else if (irType === IrNodeType.Signal) {
			code += transformedSignal;

			newOffset = transformedSignal.length;

			irIndex += IrNodeOffset.BaseSize;
		} else if (irType === IrNodeType.Memo) {
			code += transformedMemo;

			newOffset = transformedMemo.length;

			irIndex += IrNodeOffset.BaseSize;
		} else if (irType === IrNodeType.Effect) {
			code += transformedEffect;

			newOffset = transformedEffect.length;

			irIndex += IrNodeOffset.BaseSize;
		} else if (irType === IrNodeType.Component) {
			const name = ir[irIndex + IrNodeOffset.ComponentName];

			const generatedComponent = transformedComponent + name + '=';
			code += generatedComponent;

			newOffset = generatedComponent.length;

			irIndex += IrNodeOffset.ComponentSize;
		} else if (irType === IrNodeType.RecoveredError) {
			const replacement = ir[
				irIndex + IrNodeOffset.RecoveredReplacement
			] as string;

			code += replacement;

			newOffset = replacement.length;

			irIndex += IrNodeOffset.RecoveredSize;
		} else if (irType === IrNodeType.ComponentBlockStart) {
			code += COMPONENT_BLOCK_START;
			newOffset = COMPONENT_BLOCK_START.length;
			irIndex += IrNodeOffset.BaseSize;
		} else if (irType === IrNodeType.PropsPlaceholder) {
			code += PROPS_PLACEHOLDER;
			newOffset = PROPS_PLACEHOLDER.length;
			irIndex += IrNodeOffset.BaseSize;
		} else {
			const transformedPropsKeyword =
				(irType === IrNodeType.PropsSignal
					? propsSignalLabel
					: irType === IrNodeType.PropsRef
						? propsRefLabel
						: propsMemoLabel) + ',';

			code += transformedPropsKeyword;

			newOffset = transformedPropsKeyword.length;

			irIndex += IrNodeOffset.BaseSize;
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
			[propsSignalLabel]: 'propSignal',
			[propsMemoLabel]: 'propMemo',
			[propsRefLabel]: 'propRef',
		},

		idContext,

		runtimeApiNames,
	};
};
