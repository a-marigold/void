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

import {
    generateUniqueIdentifier,
    handleProps,
    generateImports,
} from './utils';

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
     *
     * {@link PreprocessResult.errors}.
     */
    const errors: CompileError[] = [];

    /**
     *
     *
     *
     * Derived from {@link getLineIndexes} with {@link source}.
     */

    const lineIndexes = getLineIndexes(source);

    /**
     * Flattened array with `PreprocessASTNode` for conventient generating preprocessed code.
     */
    const ast: PreprocessASTNode[] = [];

    /**
     *
     * `Set` with all identifiers of `source`.
     */
    const identifiers = new Set<string>();

    const context: PreprocessContext = {
        source,
        pos: 0,
        isRegExpAllowed: true,
    };

    /**
     *
     * Used to identify is there at least one component in `source`.
     *
     */

    let isComponentAppeared: boolean = false;

    /**
     *
     * The last token that `getNextToken` returned.
     *
     */
    let lastToken: PreprocessToken | null | null = null;

    while (true) {
        const currentToken = getNextToken(context);

        if (!currentToken) {
            break;
        }

        if (currentToken.type === PreprocessTokenType.Identifier) {
            if (lastToken?.value === '.') {
                continue;
            }

            lastToken = currentToken;

            const identifier = currentToken.value;

            if (identifier !== COMPONENT_START_KEYWORD) {
                identifiers.add(identifier);

                continue;
            }

            const startSymbol = getNextToken(context);

            if (startSymbol?.value !== '<') {
                continue;
            }

            const name = expectNextToken(
                context,
                lineIndexes,
                errors,
                PreprocessTokenType.Identifier,
                null,
                compileErrors.IDENTIFIER_EXPECTED('component'),
            );

            if (name === TokenCode.Missing) {
                ast.push({
                    type: 'recovered',

                    start: currentToken.start,
                    end: context.pos,
                    replacement: '',
                });

                break;
            }

            if (name === TokenCode.Unexpected) {
                ast.push({
                    type: 'recovered',
                    start: currentToken.start,
                    end: context.pos,
                    replacement: 'function',
                });

                continue;
            }

            if (isLowerCase(name.value[0])) {
                errors.push(
                    CompileError.fromAbsolutePos(
                        lineIndexes,
                        compileErrors.COMPONENT_NAME_CAPTIALIZE,
                        name.start,
                        name.end,
                    ),
                );
            }

            const closeSymbol = expectNextToken(
                context,
                lineIndexes,
                errors,
                PreprocessTokenType.Punctuator,
                '>',
                compileErrors.TOKEN_EXPECTED('>'),
            );

            if (closeSymbol === TokenCode.Missing) {
                ast.push({
                    type: 'recovered',
                    start: currentToken.start,

                    end: context.pos,
                    replacement: '',
                });

                break;
            }

            const propsStartSymbol = expectNextToken(
                context,
                lineIndexes,
                errors,
                PreprocessTokenType.Punctuator,
                '(',
                compileErrors.TOKEN_EXPECTED('('),
            );

            if (typeof propsStartSymbol === 'number') {
                ast.push({
                    type: 'recovered',
                    start: currentToken.start,
                    end: context.pos,
                    replacement: '',
                });

                break;
            }

            const props = handleProps(context, propsStartSymbol.start);

            ast.push({
                type: 'component',
                start: currentToken.start,
                end: context.pos,
                name: name.value,
                props,
            });

            if (isComponentAppeared) {
                errors.push(
                    CompileError.fromAbsolutePos(
                        lineIndexes,
                        compileErrors.MULTIPLE_COMPONENTS,

                        name.start,

                        name.end,
                    ),
                );
            }

            isComponentAppeared = true;

            continue;
        }

        if (currentToken.type === PreprocessTokenType.VoidKeyword) {
            if (DECLARATION_KEYWORDS.has(lastToken?.value ?? '')) {
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

            const keyword = currentToken.value as VoidKeyword;

            ast.push({
                type: keyword,
                start: currentToken.start,
                end: currentToken.end,
            });

            lastToken = currentToken;

            continue;
        }

        lastToken = currentToken;
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
