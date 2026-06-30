/// <reference types="node" />
import { Receiver, WebSocketTransporter } from '@liphium/neoroute-ts';
import { registerReceiver } from './receiver.js';
import * as readline from 'node:readline';
import { sendEchoRequest, sendSubmitPunRequest } from './requests.js';

async function main() {
	const r = new Receiver({
		errorHandler: (err: Error) => {
			console.log('error with receiver', err);
		},
		requestTimeout: 1000, // time.Second * 1 in Millisekunden
	});

	registerReceiver(r);

	const t = new WebSocketTransporter(r);

	try {
		await t.connect('ws://localhost:6121/');
		console.log('Connected to server.');
	} catch (err) {
		console.error(`failed to connect to server: ${err}`);
		process.exit(1);
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: '',
	});

	console.log('Type exit to quit the program.');
	console.log('Type "Pun " followed by a pun to submit it to the server.');
	console.log(
		'Type "Echo " followed by a message to receive a echo message from the server.',
	);

	rl.on('line', (line) => {
		const input = line.trim();

		if (input.startsWith('Pun ')) {
			const pun = input.slice(4);
			console.log('Sending pun to server');
			sendSubmitPunRequest(r, pun);
		} else if (input.startsWith('Echo ')) {
			const msg = input.slice(5);
			console.log('Sending echo to server');
			sendEchoRequest(r, msg);
		} else if (input === 'exit') {
			t.close();
			rl.close();
		}
	});

	rl.on('close', () => {
		console.log('Connection closed');
		process.exit(0);
	});
}

main();
