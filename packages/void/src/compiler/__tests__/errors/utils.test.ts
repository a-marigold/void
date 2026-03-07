import { describe, it, expect } from 'bun:test';

import { getNewLineIndexes, getIndexLocation } from '../../errors/utils';

/**
 *
 */
describe('getNewLineIndexes', () => {
    it('should return an empty array if there is not any line feed', () => {
        expect(getNewLineIndexes('abcdef   \t').length).toBe(0);
    });

    it('should return array with correct indexes', () => {
        expect(getNewLineIndexes('abc\ndef\nghk')).toEqual([3, 7]);
    });
    it("`\r\n` string's indexes should be greater by 1 from `\n` string's indexes", () => {
        const LFSource = 'abc \n def \n ghk';
        const CRLFSource = 'abc \r\n def \r\n ghk';

        expect(getNewLineIndexes(LFSource)).toEqual(
            getNewLineIndexes(CRLFSource).map(
                (lineIndex, index) => lineIndex - index - 1,
            ),
        );
    });
});

describe('getIndexLocation', () => {
    it('should return line that equals to 1 if newLineIndexes.length is 0', () => {
        expect(getIndexLocation([], 16.6).line).toBe(1);
    });

    it('should return one-based line and zero based column', () => {
        expect(getIndexLocation([], 17)).toEqual({ line: 1, column: 16 });
    });

    it('should return correct location of index', () => {
        expect(getIndexLocation([3, 6, 16], 10)).toEqual({
            line: 3,
            column: 3,
        });
    });
});
