import { describe, it, expect } from 'bun:test';

import { generate } from '@babel/generator';

import {
    generateChildPath,
    generateSiblingPath,
} from '../../../transformer/jsx';

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
