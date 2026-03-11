import MagicString from 'magic-string';

import { getNextToken, expectNextToken, syncToToken } from './tokens';

import type {
    PreprocessToken,
    PreprocessContext,
    PreprocessASTNode,
    PreprocessResult,
} from './types';

import {
    LABEL_PREFIXES,
    TRANSFORMED_SIGNAL_KEYWORD,
    TRANSFORMED_COMPUTATION_KEYWORD,
    TRANSFORMED_COMPONENT_KEYWORD,
    COMPONENT_START_KEYWORD,
    DECLARATION_KEYWORDS,
    COMPONENT_INTERRUPTS,
    tokenErrorCodes,
} from './constants';

import type { VoidKeyword } from '../types';

import { CompileError, getLineIndexes, compileErrors } from '../errors';

import { generateUniqueIdentifier } from './utils';

/**
 *
 * #### Transforms `void-js` syntax to valid `jsx`.
 * #### Generates unique labels for `void-js` syntax (like `signal`) to identify it in transformer later.
 *
 *
 * @param source String with `void-js` source code.
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
 * Output:
 *
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
 */

export const preprocess = (source: string): PreprocessResult => {
    /**
     *
     * {@link PreprocessResult.errors}.
     */
    const errors: CompileError[] = [];

    /**
     *
     * Array with positions of `\n` characters in source.
     *
     * Used for correct error positions.
     */
    const lineIndexes = getLineIndexes(source);

    /**
     *
     * Flattened array with `PreprocessASTNode` for conventient `UserCode` and `void-js` keywords concatinating.
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
     * The last token that `getNextToken` returned.
     */

    let lastToken: PreprocessToken | null = null;

    while (true) {
        const currentToken = getNextToken(context);

        if (!currentToken) {
            break;
        }

        if (currentToken.type === 'Identifier') {
            // Dot and bracket notation
            if (lastToken?.value === '.' || lastToken?.value === '[') {
                lastToken = currentToken;

                continue;
            }
            const identifier = currentToken.value;
            if (identifier !== COMPONENT_START_KEYWORD) {
                identifiers.add(identifier);

                lastToken = currentToken;

                continue;
            }

            const componentStartSymbol = getNextToken(context);

            if (componentStartSymbol?.value !== '<') {
                lastToken = currentToken;

                continue;
            }

            const componentName = expectNextToken(
                context,

                lineIndexes,
                errors,

                'Identifier',

                null,

                compileErrors.IDENTIFIER_EXPECTED('component'),
            );

            if (componentName === tokenErrorCodes.Missing) {
                ast[ast.length] = {
                    type: 'RecoveredFatal',
                    start: currentToken.start,
                    end: context.pos,
                };
                break;
            }

            const nameEndSymbol = expectNextToken(
                context,
                lineIndexes,
                errors,
                'Punctuator',
                '>',
                compileErrors.TOKEN_EXPECTED('>'),
            );

            if (nameEndSymbol === tokenErrorCodes.Missing) {
                ast[ast.length] = {
                    type: 'RecoveredFatal',
                    start: currentToken.start,
                    end: context.pos,
                };
                break;
            }

            if (
                componentName === tokenErrorCodes.Unexpected ||
                nameEndSymbol === tokenErrorCodes.Unexpected
            ) {
                const propsStartSymbol = syncToToken(
                    context,
                    COMPONENT_INTERRUPTS,
                    'Punctuator',
                    '(',
                );

                if (!propsStartSymbol) {
                    ast[ast.length] = {
                        type: 'RecoveredFatal',
                        start: currentToken.start,
                        end: context.pos,
                    };

                    break;
                }
            }

            const propsStartSymbol = expectNextToken(
                context,
                lineIndexes,
                errors,

                'Punctuator',
                '(',
                compileErrors.TOKEN_EXPECTED('('),
            );

            if (propsStartSymbol === tokenErrorCodes.Missing) {
                ast[ast.length] = {
                    type: 'RecoveredFatal',
                    start: currentToken.start,
                    end: context.pos,
                };

                break;
            }

            const propsStartSymbolEnd = context.pos;

            let openedBracketCount = 1;
            let closedBracketCount = 0;
            props: while (openedBracketCount > closedBracketCount) {
                const token = getNextToken(context);

                if (!token) {
                    break props;
                }

                if (token.value === '(') {
                    openedBracketCount++;
                } else if (token.value === ')') {
                    closedBracketCount++;
                }
            }

            const propsEnd = context.pos;

            if (propsStartSymbol === tokenErrorCodes.Unexpected) {
                ast[ast.length] = {
                    type: 'RecoveredComponent',
                    start: currentToken.start,
                    end: propsEnd,
                    props: '(' + source.slice(propsStartSymbolEnd, propsEnd),
                };

                continue;
            }

            if (componentName === tokenErrorCodes.Unexpected) {
                ast[ast.length] = {
                    type: 'RecoveredComponent',
                    start: componentStartSymbol.start,
                    end: propsEnd,
                    props: source.slice(propsStartSymbol.start, propsEnd),
                };

                continue;
            }

            ast[ast.length] = {
                type: 'Component',
                start: componentStartSymbol.start,

                end: propsEnd,
                name: componentName.value,

                props: source.slice(propsStartSymbol.start, propsEnd),
            };

            continue;
        }

        if (currentToken.type === 'VoidKeyword') {
            if (DECLARATION_KEYWORDS.has(lastToken?.value ?? '')) {
                errors[errors.length] = CompileError.fromAbsolutePos(
                    lineIndexes,
                    compileErrors.KEYWORD_AS_VARIABLE_NAME(currentToken.value),
                    currentToken.start,
                    currentToken.end,
                );

                continue;
            }

            const keyword = currentToken.value as VoidKeyword;

            if (keyword === 'signal') {
                ast[ast.length] = {
                    type: 'Signal',

                    start: currentToken.start,

                    end: currentToken.end,
                };
            } else if (keyword === 'effect') {
                ast[ast.length] = {
                    type: 'Effect',
                    start: currentToken.start,

                    end: currentToken.end,
                };
            } else if (keyword === 'computation') {
                ast[ast.length] = {
                    type: 'Computation',

                    start: currentToken.start,
                    end: currentToken.end,
                };
            }

            lastToken = currentToken;

            continue;
        }

        lastToken = currentToken;
    }

    const signalLabel = generateUniqueIdentifier(
        identifiers,
        LABEL_PREFIXES.signal,
    );
    const effectLabel = generateUniqueIdentifier(
        identifiers,

        LABEL_PREFIXES.effect,
    );
    const computationLabel = generateUniqueIdentifier(
        identifiers,
        LABEL_PREFIXES.computation,
    );
    const componentLabel = generateUniqueIdentifier(
        identifiers,
        LABEL_PREFIXES.component,
    );
    const recoveredComponentLabel = generateUniqueIdentifier(
        identifiers,

        LABEL_PREFIXES.recoveredComponent,
    );

    const magicString = new MagicString(source);

    magicString.prepend(
        'let ' + signalLabel + ',' + effectLabel + ',' + computationLabel + ';',
    );

    // transformed labels for keywords to be concatinated in transformation

    const transformedSignal =
        ';' + signalLabel + ';' + TRANSFORMED_SIGNAL_KEYWORD + ' ';

    const transformedEffect = effectLabel + '=';

    const transformedComputation =
        ';' + computationLabel + ';' + TRANSFORMED_COMPUTATION_KEYWORD + ' ';

    const transformedComponent = TRANSFORMED_COMPONENT_KEYWORD + ' ';

    const transformedRecoveredComponent = recoveredComponentLabel + '=';

    const astLength = ast.length;

    let astIndex = 0;
    while (astIndex < astLength) {
        const node = ast[astIndex];

        if (node.type === 'Signal') {
            magicString.overwrite(node.start, node.end, transformedSignal);
        } else if (node.type === 'Effect') {
            magicString.overwrite(node.start, node.end, transformedEffect);
        } else if (node.type === 'Computation') {
            magicString.overwrite(node.start, node.end, transformedComputation);
        } else if (node.type === 'Component') {
            magicString.overwrite(
                node.start,
                node.end,
                transformedComponent + node.name + '=' + node.props + '=>',
            );
        } else if (node.type === 'RecoveredFatal') {
            magicString.overwrite(node.start, node.end, '');
        } else if (node.type === 'RecoveredComponent') {
            magicString.overwrite(
                node.start,
                node.end,
                transformedRecoveredComponent + node.props + '=>',
            );
        }

        astIndex++;
    }

    return {
        code: magicString.toString(),
        sourceMap: magicString.generateMap({ hires: true }),
        errors,

        keywordLabels: new Map([
            [signalLabel, 'signal'],
            [effectLabel, 'effect'],
            [computationLabel, 'computation'],
        ]),
        runtimeApiNames: new Map([
            ['Signal', generateUniqueIdentifier(identifiers, '_$st')],
            ['getValue', generateUniqueIdentifier(identifiers, '_$gv')],
            ['setValue', generateUniqueIdentifier(identifiers, '_$sv')],
            ['postSetValue', generateUniqueIdentifier(identifiers, '_$psv')],
            ['createEffect', generateUniqueIdentifier(identifiers, '_$ce')],
            [
                'createComputation',
                generateUniqueIdentifier(identifiers, '_$cc'),
            ],
            ['compute', generateUniqueIdentifier(identifiers, '_$c')],
        ]),
    };
};
