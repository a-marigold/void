import { GenMapping, addSegment, toDecodedMap } from '@jridgewell/gen-mapping';

import { getNextToken, expectNextToken } from './tokens';

import type { Token, PreprocessContext, PreprocessIR, PreprocessResult } from './types';

import {
    TRANSFORMED_REACTIVE_KEYWORD,
    TRANSFORMED_COMPONENT_KEYWORD,
    COMPONENT_START_KEYWORD,
    DECLARATION_KEYWORDS,
    TokenType,
    IrNodeType,
    TokenCode,
} from './constants';

import type { VoidKeyword } from '../../types';
import { RUNTIME_TYPE_NAMES } from '../../constants';
import { CompileError, compileErrors, getLineIndexes, getIndexLocation } from '../../errors';

import { generateUniqueIdentifier, getProps, generateImports } from './utils';

import { isLowerCase } from '../../utils';
/**
 * #### Transforms `void-js` syntax to valid `jsx`.
 * #### Generates unique labels for `void-js` syntax (like `signal`) to identify it in transformer later.
 *
 * @param source String with `void-js` source code.
 *
 * @returns String with valid `jsx` to be transformed.
 *
 * @example
 *
 * ```typescript
 * preprocess(`
 * signal count = 10;
 * memo doubled = () => count * 2;
 *
 * effect () => {
 *   console.log(doubled);
 * };`);
 * ```
 *
 * Preprocessed code:
 *
 * ```typescript
 * let _$singal, _$effect, _$memo; // initialized labels
 *
 *
 * _$signal; // added label to identify signal in transformer
 * let count = 10;
 *
 * _$memo; // added label to identify memo in transformer
 * const dobuled = () => count * 2;
 *
 * _$effect = () => { // effects do not have regular labels. they have assignment instead. that is better for transformer
 *   console.log(doubled);
 * };
 * ```
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
    // TODO: COLLAPSE IR
    /**
     * `name`, `props` of {@link IrNodeType.Component} are stored to {@link componentsIr}.
     *
     * `replacement`'s of {@link IrNodeType.Recovered} are stored to {@link recoveredIr}.
     *
     * @see {@link PreprocessIR}.
     *
     *  @see {@link  IrNodeType}.
     */
    const ir: PreprocessIR = [];

    /**
     * ```typescript
     * componentsIr.push(name, props);
     * ```
     */
    const componentsIr: string[] = [];

    /**
     * Array with replacements of {@link IrNodeType.Recovered} nodes.
     */
    const recoveredIr: string[] = [];

    /**
     * `Set` with all identifiers of `source`.
     */
    const identifiers = new Set<string>();

    /**
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

    while (currentToken.type !== TokenType.End) {
        getNextToken(context);

        const currentValue = currentToken.value;
        const currentStart = currentToken.start;

        if (currentToken.type === TokenType.Identifier) {
            if (lastTokenValue === '.') {
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
                compileErrors.IDENTIFIER_EXPECTED('component'),
            );

            const nameValue = currentToken.value;
            const nameStart = currentToken.start;
            const nameEnd = currentToken.end;

            if (nameCode === TokenCode.Missing) {
                ir.push(IrNodeType.Recovered, currentStart, nameEnd);
                recoveredIr.push('');

                lastUserCodeStart = nameEnd;

                break;
            }

            if (nameCode === TokenCode.Unexpected) {
                ir.push(IrNodeType.Recovered, currentStart, nameEnd);
                recoveredIr.push('function');

                lastUserCodeStart = nameEnd;

                continue;
            }

            const closeSymbolCode = expectNextToken(
                context,
                lineIndexes,
                errors,
                TokenType.Punctuator,
                '>',
                compileErrors.TOKEN_EXPECTED('>'),
            );

            if (closeSymbolCode === TokenCode.Missing) {
                ir.push(IrNodeType.Recovered, currentStart, context.pos);
                recoveredIr.push('');
                break;
            }

            if (
                expectNextToken(
                    context,
                    lineIndexes,
                    errors,
                    TokenType.Punctuator,
                    '(',
                    compileErrors.TOKEN_EXPECTED('('),
                )
            ) {
                ir.push(IrNodeType.Recovered, currentStart, context.pos);

                recoveredIr.push('');

                continue;
            }

            const propsStartSymbolStart = currentToken.start;

            const props = getProps(context, propsStartSymbolStart);

            const propsEnd = context.pos;

            ir.push(IrNodeType.Component, currentStart, propsEnd);
            componentsIr.push(nameValue, props);

            if (isLowerCase(nameValue[0])) {
                errors.push(
                    CompileError.fromAbsolutePos(
                        lineIndexes,
                        compileErrors.COMPONENT_NAME_CAPTIALIZE,
                        nameStart,
                        nameEnd,
                    ),
                );
            }

            lastUserCodeStart = propsEnd;

            continue;
        }

        if (currentToken.type === TokenType.VoidKeyword) {
            if (DECLARATION_KEYWORDS.has(lastTokenValue)) {
                errors.push(
                    CompileError.fromAbsolutePos(
                        lineIndexes,
                        compileErrors.KEYWORD_AS_VARIABLE_NAME(currentToken.value),
                        currentToken.start,
                        currentToken.end,
                    ),
                );

                continue;
            }

            ir.push(IrNodeType.UserCode, lastUserCodeStart, currentStart);

            ir.push(
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

    const runtimeApiNames: PreprocessResult['runtimeApiNames'] = {
        Signal: generateUniqueIdentifier(identifiers, '_$0'),

        getValue: generateUniqueIdentifier(identifiers, '_$1'),
        setValue: generateUniqueIdentifier(identifiers, '_$2'),
        postSetValue: generateUniqueIdentifier(identifiers, '_$3'),
        createEffect: generateUniqueIdentifier(identifiers, '_$4'),
        createMemo: generateUniqueIdentifier(identifiers, '_$5'),
        computeMemo: generateUniqueIdentifier(identifiers, '_$6'),
    };

    const signalLabel = generateUniqueIdentifier(identifiers, '_$7');
    const effectLabel = generateUniqueIdentifier(identifiers, '_$8');
    const memoLabel = generateUniqueIdentifier(identifiers, '_$9');
    const componentLabel = generateUniqueIdentifier(identifiers, '_$a');

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
     * Last line in {@link source} appeared in codegen.
     */

    let lastLine = 0;

    /**
     * Column offset of {@link lastLine} in generated code.
     */
    let lastColumnOffset = 0;

    let irIndex = 0;
    let componentIndex = 0;
    let recoveredIndex = 0;
    while (irIndex < ir.length) {
        const nodeType = ir[irIndex];
        irIndex++;
        const nodeStart = ir[irIndex];
        irIndex++;
        const nodeEnd = ir[irIndex];

        const nodeLoc = getIndexLocation(lineIndexes, nodeStart);

        /**
         * {@link addSegment} has 0-based lines, so `- 1` is needed.
         */
        const nodeLine = nodeLoc.line - 1;

        const nodeColumn = nodeLoc.column;

        let newOffset = 0;

        if (nodeType === IrNodeType.UserCode) {
            code += source.slice(nodeStart, nodeEnd);
        } else if (nodeType === IrNodeType.Signal) {
            code += transformedSignal;

            newOffset = transformedSignal.length;
        } else if (nodeType === IrNodeType.Memo) {
            code += transformedMemo;

            newOffset = transformedMemo.length;
        } else if (nodeType === IrNodeType.Effect) {
            code += transformedEffect;

            newOffset = transformedEffect.length;
        } else if (nodeType === IrNodeType.Component) {
            const name = componentsIr[componentIndex];
            componentIndex++;
            const props = componentsIr[componentIndex];

            const generatedComponent = transformedComponent + name + '=' + props + '=>';

            code += generatedComponent;

            newOffset = generatedComponent.length;

            componentIndex++;
        } else if (nodeType === IrNodeType.Recovered) {
            const replacement = recoveredIr[recoveredIndex];

            code += replacement;

            newOffset = replacement.length;

            recoveredIndex++;
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
            addSegment(genMapping, nodeLine, nodeColumn, '__SOURCE__.vd', nodeLine, nodeColumn);
            lastLine = nodeLine;
            lastColumnOffset = 0;
        }

        irIndex++;
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
