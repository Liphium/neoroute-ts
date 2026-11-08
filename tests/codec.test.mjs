import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { encode, ExtData } from '@msgpack/msgpack';
import { decode } from '../dist/codec.js';

// Produced by msgp v1.6.4's AppendTime, using time.Unix/Date and time.Time{}.
const fixtures = JSON.parse(
	readFileSync(new URL('./fixtures/msgp-time.json', import.meta.url), 'utf8'),
);

test('decodes Go msgp time fixtures, including negative seconds and nanoseconds', () => {
	for (const { name, hex, iso } of fixtures) {
		const bytes = Buffer.from(hex, 'hex');
		const date = decode(bytes);
		assert.ok(date instanceof Date, name);
		assert.equal(date.toISOString(), iso, name);
	}
});

const invalidTimes = [
	new Uint8Array(11),
	new Uint8Array(13),
	Buffer.from('00000000000000003b9aca00', 'hex'), // 1 billion nanoseconds
	Buffer.from('0000000000000000ffffffff', 'hex'), // negative nanoseconds
	Buffer.from('7fffffffffffffff00000000', 'hex'), // outside Date's range
];

test('rejects malformed and out-of-range Go time extensions', () => {
	for (const bytes of invalidTimes) {
		assert.throws(() => decode(encode(new ExtData(5, bytes))), RangeError);
	}
});
