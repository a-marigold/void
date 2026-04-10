import MagicString from 'magic-string';

import { getNextToken, expectNextToken } from './tokens';

import type {
    PreprocessToken,
    PreprocessContext,
    PreprocessASTNode,
    PreprocessResult,
} from './types';
import {
    TRANSFORMED_REACTIVE_KEYWORD,
    TRANSFORMED_COMPONENT_KEYWORD,
    COMPONENT_START_KEYWORD,
    DECLARATION_KEYWORDS,
    PreprocessTokenType,
    TokenCode,
} from './constants';

import type { VoidKeyword } from '../../types';
import { RUNTIME_TYPE_NAMES } from '../../constants';

import { CompileError, getLineIndexes, compileErrors } from '../../errors';

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
     * Flattened array with `PreprocessASTNode` for conventient generating preprocessed code.
     */
    const ast: PreprocessASTNode[] = [];

    /**
     * `Set` with all identifiers of `source`.
     */
    const identifiers = new Set<string>();

    /**
     *
     * {@link context.currentToken}.
     */

    const currentToken: PreprocessToken = {
        type: PreprocessTokenType.Start,

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

    /**
     * The last appeared {@link PreprocessToken.value}.
     */
    let lastTokenValue: PreprocessToken['value'] = '';

    while (currentToken.type !== PreprocessTokenType.End) {
        getNextToken(context);

        const currentValue = currentToken.value;

        const currentStart = currentToken.start;

        if (currentToken.type === PreprocessTokenType.Identifier) {
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

            const nameCode = expectNextToken(
                context,
                lineIndexes,
                errors,
                PreprocessTokenType.Identifier,
                null,
                compileErrors.IDENTIFIER_EXPECTED('component'),
            );

            const nameValue = currentToken.value;
            const nameStart = currentToken.start;
            const nameEnd = currentToken.end;

            if (nameCode === TokenCode.Missing) {
                ast.push({
                    type: 'recovered',
                    replacement: '',
                    start: currentStart,
                    end: context.pos,
                });

                break;
            }

            if (nameCode === TokenCode.Unexpected) {
                ast.push({
                    type: 'recovered',
                    replacement: 'function',
                    start: currentStart,
                    end: context.pos,
                });

                continue;
            }

            const closeSymbolCode = expectNextToken(
                context,
                lineIndexes,
                errors,
                PreprocessTokenType.Punctuator,
                '>',
                compileErrors.TOKEN_EXPECTED('>'),
            );

            if (closeSymbolCode === TokenCode.Missing) {
                ast.push({
                    type: 'recovered',
                    replacement: '',
                    start: currentStart,
                    end: context.pos,
                });

                break;
            }

            if (
                expectNextToken(
                    context,
                    lineIndexes,
                    errors,
                    PreprocessTokenType.Punctuator,
                    '(',
                    compileErrors.TOKEN_EXPECTED('('),
                )
            ) {
                ast.push({
                    type: 'recovered',
                    replacement: '',
                    start: currentStart,
                    end: context.pos,
                });
            }
            const propsStartSymbolStart = currentToken.start;

            const props = getProps(context, propsStartSymbolStart);

            ast.push({
                type: 'component',
                name: nameValue,
                props,
                start: currentStart,
                end: context.pos,
            });

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

            continue;
        }

        if (currentToken.type === PreprocessTokenType.VoidKeyword) {
            if (DECLARATION_KEYWORDS.has(lastTokenValue)) {
                errors.push(
                    CompileError.fromAbsolutePos(
                        lineIndexes,
                        compileErrors.KEYWORD_AS_VARIABLE_NAME(
                            currentToken.value,
                        ),
                        currentToken.start,
                        currentToken.end,
                    ),
                );

                continue;
            }

            ast.push({
                type: currentValue as VoidKeyword,
                start: currentToken.start,
                end: currentToken.end,
            });

            lastTokenValue = currentValue;

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
        generateImports(
            runtimeApiNames,
            RUNTIME_TYPE_NAMES,
            '________SOURCE________',
        ),
    );

    // transformed labels for keywords to be concatinated in transformation
    const transformedSignal =
        ';' + signalLabel + ';' + TRANSFORMED_REACTIVE_KEYWORD + ' ';

    const transformedEffect = effectLabel + '=';

    const transformedComputation =
        ';' + computationLabel + ';' + TRANSFORMED_REACTIVE_KEYWORD + ' ';

    const transformedComponent =
        ';' +
        componentLabel +
        '; export ' +
        TRANSFORMED_COMPONENT_KEYWORD +
        ' ';

    for (let astIndex = 0; astIndex < ast.length; astIndex++) {
        const node = ast[astIndex];

        const nodeType = node.type;

        if (nodeType === 'signal') {
            magicString.overwrite(node.start, node.end, transformedSignal);
            continue;
        }

        if (nodeType === 'computation') {
            magicString.overwrite(node.start, node.end, transformedComputation);
            continue;
        }

        if (nodeType === 'effect') {
            magicString.overwrite(node.start, node.end, transformedEffect);
            continue;
        }
        if (nodeType === 'component') {
            magicString.overwrite(
                node.start,
                node.end,
                transformedComponent + node.name + '=' + node.props + '=>',
            );
            continue;
        }

        if (nodeType === 'recovered') {
            magicString.overwrite(node.start, node.end, node.replacement);
            continue;
        }
    }

    return {
        code: magicString.toString(),
        sourceMap: magicString.generateMap({ hires: true }),
        errors,

        assignableLabels: { effectLabel: 'effect' },
        unassignableLabels: {
            signalLabel: 'signal',
            computationLabel: 'computation',
            componentLabel: 'component',
        },

        identifiers,
        runtimeApiNames,
    };
};
