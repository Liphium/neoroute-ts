// Start ../neoroute/examples/chat_server with `go run .` before running this test.
import assert from 'node:assert/strict';
import { HttpConnector } from '../examples/chat_client_http/src/generated/connector_http.js';
import { WsConnector } from '../examples/chat_client_ws/src/generated/connector_ws.js';
import { UserError, withTimeout } from '../dist/index.js';

const errors: Error[] = [];
const config = {
	errorHandler: (e: Error) => {
		errors.push(e);
		return e.message;
	},
	requestTimeout: 5000,
};
const http = new HttpConnector(config, 'POST', 'http://localhost:6121/http');
let opened!: () => void;
const ready = new Promise<void>((resolve) => {
	opened = resolve;
});
const ws = new WsConnector({ ...config, onOpen: () => opened() });
const events: { text: string; sender: string }[] = [];
ws.onMessage((event) => events.push(event));
ws.connect('ws://localhost:6121/ws');
try {
	await withTimeout(ready, 5000);
	// Exercise binary length headers at the bin8/bin16/bin32 boundaries, up to
	// just below the server's default 2 MiB body limit, through both connectors.
	for (const [transport, connector] of [
		['http', http],
		['ws', ws],
	] as const) {
		for (const size of [1, 256, 65536, 2 * 1024 * 1024 - 128]) {
			const text = 'x'.repeat(size);
			assert.equal(
				await connector.send(
					{ sender: transport, text },
					{ requestTimeout: 10000 },
				),
				undefined,
			);
			const deadline = Date.now() + 5000;
			while (
				!events.some((e) => e.sender === transport && e.text === text)
			) {
				assert.ok(Date.now() < deadline, 'broadcast timed out');
				await new Promise((r) => setTimeout(r, 10));
			}
		}
		const rejected = await connector.send({ sender: transport, text: '' });
		assert.ok(rejected instanceof UserError);
		assert.equal(rejected.message, 'text is required');
	}
	assert.equal(errors.length, 0);
	// The chat route returns the server error handler message for oversized bodies.
	const tooLarge = await http.send({
		sender: 'http',
		text: 'x'.repeat(2 * 1024 * 1024),
	});
	assert.ok(tooLarge instanceof UserError);
	assert.equal(tooLarge.message, 'Something went wrong.');
	assert.equal(errors.length, 0);
	console.log(
		'HTTP and WebSocket chat compatibility passed (events, errors, binary sizes, size rejection).',
	);
} finally {
	ws.close();
}
