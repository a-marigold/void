import { describe, it, expect } from 'bun:test';

import { parseExpression } from '@babel/parser';

import { generate } from '@babel/generator';

import type { JSXElement } from '@babel/types';

import {
    generateChildPath,
    generateSiblingPath,
    markParentsDynamic,
} from '../../../transformer/jsx';

import type { AnalyzeJSXResult } from '../../../transformer/types';
describe('generateChildPath', () => {
    it('should return `parentName.firstChild` if `childIndex` is `0`', () => {
        expect(
            generate(generateChildPath('parentDiv', 0)).code,
        ).toMatchInlineSnapshot(`"parentDiv.firstChild"`);
    });
    it('should return correct path with `nextSibling` property accesses', () => {
        expect(
            generate(generateChildPath('parentEl', 6)).code,
        ).toMatchInlineSnapshot(
            `"parentEl.firstChild.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling"`,
        );
    });
});

describe('generateSiblingPath', () => {
    it('should return identifier babelnode if `siblingIndex` is `0`', () => {
        const anchorName = 'siblingEle';

        expect(generateSiblingPath(anchorName, 0)).toHaveProperty(
            'name',

            anchorName,
        );
    });

    it('should return correct path to sibling', () => {
        expect(
            generate(generateSiblingPath('anchor', 6)).code,
        ).toMatchInlineSnapshot(
            `"anchor.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling"`,
        );
    });
});

describe('markParentsDynamic', () => {
    it('should add all the parents of `node` to `dynamicNodes`', () => {
        const div = parseExpression(
            `<div><header><span>{'dynamic'}</span></header></div>`,
            { plugins: ['jsx'] },
        ) as JSXElement;

        const header = div.children[0] as JSXElement;
        const span = header.children[0] as JSXElement;
        const dynamicText = span.children[0];

        const parents = new WeakMap([
            [header, div],
            [span, header],
            [dynamicText, span],
        ]);

        const dynamicNodes: AnalyzeJSXResult['dynamicNodes'] = new Set();

        markParentsDynamic(dynamicText, parents, dynamicNodes);

        expect(
            [div, header, span].every((parent) => {
                return dynamicNodes.has(parent);
            }),
        ).toBe(true);
    });
});
