import { describe, it, expect } from 'bun:test';

import { resetNode } from '../../../phases/transformer/nodes';

import { mockParse } from './__testingUtils__';

describe('nodes', () => {
	describe('resetNode', () => {
		it('should reset the root node', () => {
			expect(resetNode(mockParse('foo'))).toMatchInlineSnapshot(`
			  {
			    "decorators": [],
			    "end": 0,
			    "name": "foo",
			    "optional": false,
			    "start": 0,
			    "type": "Identifier",
			    "typeAnnotation": null,
			  }
			`);
		});

		it('should reset all the property-children of node', () => {
			expect(resetNode(mockParse('foo as string'))).toMatchInlineSnapshot(`
			  {
			    "end": 0,
			    "expression": {
			      "decorators": [],
			      "end": 0,
			      "name": "foo",
			      "optional": false,
			      "start": 0,
			      "type": "Identifier",
			      "typeAnnotation": null,
			    },
			    "start": 0,
			    "type": "TSAsExpression",
			    "typeAnnotation": {
			      "end": 0,
			      "start": 0,
			      "type": "TSStringKeyword",
			    },
			  }
			`);
		});

		it('should reset all the array-children of node', () => {
			expect(resetNode(mockParse('(a = 16, b = 16);'))).toMatchInlineSnapshot(`
			  {
			    "end": 0,
			    "expressions": [
			      {
			        "end": 0,
			        "left": {
			          "decorators": [],
			          "end": 0,
			          "name": "a",
			          "optional": false,
			          "start": 0,
			          "type": "Identifier",
			          "typeAnnotation": null,
			        },
			        "operator": "=",
			        "right": {
			          "end": 0,
			          "raw": "16",
			          "start": 0,
			          "type": "Literal",
			          "value": 16,
			        },
			        "start": 0,
			        "type": "AssignmentExpression",
			      },
			      {
			        "end": 0,
			        "left": {
			          "decorators": [],
			          "end": 0,
			          "name": "b",
			          "optional": false,
			          "start": 0,
			          "type": "Identifier",
			          "typeAnnotation": null,
			        },
			        "operator": "=",
			        "right": {
			          "end": 0,
			          "raw": "16",
			          "start": 0,
			          "type": "Literal",
			          "value": 16,
			        },
			        "start": 0,
			        "type": "AssignmentExpression",
			      },
			    ],
			    "start": 0,
			    "type": "SequenceExpression",
			  }
			`);
		});
	});
});
