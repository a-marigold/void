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
