import { GenMapping, addMapping } from '@jridgewell/gen-mapping';

import MagicString from 'magic-string';

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
 *
 * #### Transforms `void-js` syntax to valid `jsx`.
 * #### Generates unique labels for `void-js` syntax (like `signal`) to identify it in transformer later.
 *
 *
 * @param source String with `void-js` source code.
 *
 * @returns String with valid `jsx` to be transformed.
 *
 * @example
 * ```typescript
 * preprocess(`
 * signal count = 10;
 * computation doubled = () => count * 2;
 *
 * effect () => {
 *   console.log(doubled);
 * };`);
 * ```
 *
 * Preprocessed code:
 *
 * ```typescript
 * let _$singal, _$effect, _$computation; // initialized labels
 *
 * _$signal; // added label to identify signal in transformer
 * let count = 10;
 *
 * _$computation; // added label to identify computation in transformer
 * const dobuled = () => count * 2;
 *
 * _$effect = () => { // effects do not have regular labels. they have assignment instead. that is better for transformer
 *   console.log(doubled);
 * };
 * ```
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
     * `name`, `props` of {@link IrNodeType.Component} are stored to {@link componentsIr}.
     *
     * `replacement`'s of {@link IrNodeType.Recovered} are stored to {@link recoveredIr}.
     *
     * @see {@link PreprocessIR}.
     * @see {@link IrNodeType}.
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
     * Used to identify is there at least one component in `source`.
     */
    let isComponentAppeared: boolean = false;

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

            if (isComponentAppeared) {
                errors.push(
                    CompileError.fromAbsolutePos(
                        lineIndexes,
                        compileErrors.MULTIPLE_COMPONENTS,
                        nameStart,
                        nameEnd,
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
                      : IrNodeType.Computation,
                currentStart,
                currentToken.end,
            );

            lastTokenValue = currentValue;

            lastUserCodeStart = currentToken.end;

            continue;
        }

        lastTokenValue = currentValue;
    }

    const runtimeApiNames: PreprocessResult['runtimeApiNames'] = {
        Signal: generateUniqueIdentifier(identifiers, '_$st'),
        getValue: generateUniqueIdentifier(identifiers, '_$gv'),
        setValue: generateUniqueIdentifier(identifiers, '_$sv'),
        postSetValue: generateUniqueIdentifier(identifiers, '_$psv'),
        createEffect: generateUniqueIdentifier(identifiers, '_$ce'),
        createComputation: generateUniqueIdentifier(identifiers, '_$cc'),
        compute: generateUniqueIdentifier(identifiers, '_$c'),
    };

    const signalLabel = generateUniqueIdentifier(identifiers, '_$sgn');
    const effectLabel = generateUniqueIdentifier(identifiers, '_$ef');

    const computationLabel = generateUniqueIdentifier(identifiers, '_$cmp');
    const componentLabel = generateUniqueIdentifier(identifiers, '_$cmpn');

    const magicString = new MagicString(source);

    magicString.prepend(
        'let ' +
            signalLabel +
            ',' +
            effectLabel +
            ',' +
            computationLabel +
            ',' +
            componentLabel +
            ';',
    );

    magicString.prepend(
        generateImports(runtimeApiNames, RUNTIME_TYPE_NAMES, '________SOURCE________'),
    );

    // transformed labels for keywords to be concatinated in transformation
    const transformedSignal = ';' + signalLabel + ';' + TRANSFORMED_REACTIVE_KEYWORD + ' ';
    const transformedEffect = effectLabel + '=';
    const transformedComputation =
        ';' + computationLabel + ';' + TRANSFORMED_REACTIVE_KEYWORD + ' ';
    const transformedComponent =
        ';' + componentLabel + '; export ' + TRANSFORMED_COMPONENT_KEYWORD + ' ';

    let irIndex = 0;
    let componentIndex = 0;
    let recoveredIndex = 0;
    while (irIndex < ir.length) {
        const nodeType = ir[irIndex];
        irIndex++;
        const nodeStart = ir[irIndex];
        irIndex++;
        const nodeEnd = ir[irIndex];

        if (nodeType === IrNodeType.Signal) {
            magicString.overwrite(nodeStart, nodeEnd, transformedSignal);
        } else if (nodeType === IrNodeType.Computation) {
            magicString.overwrite(nodeStart, nodeEnd, transformedComputation);
        } else if (nodeType === IrNodeType.Effect) {
            magicString.overwrite(nodeStart, nodeEnd, transformedEffect);
        } else if (nodeType === IrNodeType.Component) {
            const name = componentsIr[componentIndex];
            componentIndex++;
            const props = componentsIr[componentIndex];

            magicString.overwrite(
                nodeStart,
                nodeEnd,
                transformedComponent + name + '=' + props + '=>',
            );
            componentIndex++;
        } else if (nodeType === IrNodeType.Recovered) {
            magicString.overwrite(nodeStart, nodeEnd, recoveredIr[recoveredIndex]);

            recoveredIndex++;
        }
        irIndex++;
    }

    return {
        code: magicString.toString(),
        sourceMap: magicString.generateMap({ hires: true }),

        errors,

        assignableLabels: { [effectLabel]: 'effect' },
        unassignableLabels: {
            [signalLabel]: 'signal',
            [computationLabel]: 'computation',
            [componentLabel]: 'component',
        },

        identifiers,
        runtimeApiNames,
    };
};
