import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decode, encode } from '@msgpack/msgpack';
import { Client, UserError } from '../dist/index.js';

const reply = (client, id, data, error = false) =>
	client.handle(
		encode({
			type: 0,
			data: encode({
				id,
				has_data: true,
				error,
				data: error ? new TextEncoder().encode(data) : encode(data),
			}),
		}),
	);

test('all six send functions use ordered tuples and binary bodies', async () => {
	const client = new Client({ errorHandler: (e) => e.message });
	const requests = [];
	client.setSendFunc(async (bytes) => {
		const request = decode(bytes);
		requests.push(request);
		assert.equal(request.length, 3);
		assert.ok(request[2] instanceof Uint8Array);
		if (requests.length <= 4) reply(client, request[0], { ok: true });
	});
	assert.deepEqual(await client.send('send', { value: 1 }, {}), { ok: true });
	assert.equal(await client.sendOk('ok', {}, {}), undefined);
	assert.equal(await client.sendOkNoRequest('empty-ok', {}), undefined);
	assert.deepEqual(await client.sendNoRequest('empty', {}), { ok: true });
	await client.sendNoResponse('no-response', {}, {});
	await client.sendPing('ping', {});
	assert.deepEqual(
		requests.map((r) => r[0]),
		[1, 2, 3, 4, 5, 6],
	);
	assert.deepEqual(decode(requests[0][2]), { value: 1 });
	for (const i of [2, 3, 5]) assert.equal(requests[i][2].length, 0);
	assert.equal(client.waiters.size, 0);
});

test('server errors are returned by every response-waiting send variant', async () => {
	const client = new Client({ errorHandler: (e) => e.message });
	client.setSendFunc(async (bytes) =>
		reply(client, decode(bytes)[0], 'rejected', true),
	);
	for (const result of [
		await client.send('x', {}),
		await client.sendOk('x', {}),
		await client.sendNoRequest('x'),
		await client.sendOkNoRequest('x'),
	]) {
		assert.ok(result instanceof UserError);
		assert.equal(result.message, 'rejected');
	}
});

test('per-call timeout covers stalled transports and response waits; defaults stay unchanged', async () => {
	const config = { requestTimeout: 1000, errorHandler: (e) => e.message };
	const client = new Client(config);
	for (const send of [async () => {}, () => new Promise(() => {})]) {
		client.setSendFunc(send);
		for (const call of [
			() => client.send('x', {}, { requestTimeout: 5 }),
			() => client.sendOk('x', {}, { requestTimeout: 5 }),
			() => client.sendNoRequest('x', { requestTimeout: 5 }),
			() => client.sendOkNoRequest('x', { requestTimeout: 5 }),
		]) {
			const result = await call();
			assert.ok(result instanceof UserError);
			assert.match(result.message, /timed out after 5ms/);
			assert.equal(client.waiters.size, 0);
		}
	}
	assert.equal(client.getConfig().requestTimeout, 1000);
	assert.equal(config.requestTimeout, 1000);
});

test('serialization, transport and decoding failures return UserError and clear waiters', async () => {
	const client = new Client({ errorHandler: (e) => e.message });
	assert.ok((await client.sendOk('x', {})) instanceof UserError);
	client.setSendFunc(async () => {
		throw new Error('transport failed');
	});
	assert.equal((await client.sendOk('x', {})).message, 'transport failed');
	const cyclic = {};
	cyclic.self = cyclic;
	assert.ok((await client.sendOk('x', cyclic)) instanceof UserError);
	client.setSendFunc(async (bytes) =>
		client.handleResponse(
			encode({
				id: decode(bytes)[0],
				error: false,
				data: new Uint8Array(),
			}),
		),
	);
	assert.ok((await client.send('x', {})) instanceof UserError);
	assert.equal(client.waiters.size, 0);
});

test('concurrent responses are correlated by id even when returned out of order', async () => {
	const client = new Client({ errorHandler: (e) => e.message });
	const pending = [];
	client.setSendFunc(async (bytes) => {
		pending.push(decode(bytes));
	});
	const first = client.send('first', {});
	const second = client.send('second', {});
	reply(client, pending[1][0], 'second response');
	reply(client, pending[0][0], 'first response');
	assert.deepEqual(await Promise.all([first, second]), [
		'first response',
		'second response',
	]);
	assert.equal(client.waiters.size, 0);
});

test('no-response methods honor send timeouts without registering response waiters', async () => {
	const errors = [];
	const client = new Client({
		errorHandler: (e) => {
			errors.push(e.message);
			return e.message;
		},
	});
	client.setSendFunc(() => new Promise(() => {}));
	await client.sendNoResponse('x', {}, { requestTimeout: 5 });
	await client.sendPing('x', { requestTimeout: 5 });
	assert.equal(errors.length, 2);
	assert.ok(errors.every((e) => /timed out after 5ms/.test(e)));
	assert.equal(client.waiters.size, 0);
});
