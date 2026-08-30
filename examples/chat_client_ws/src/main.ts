import { newPromiseWithResolver } from '@liphium/neoroute-ts';
import * as readline from 'node:readline';
import { WsConnector } from './generated/connector_ws.js';
import type { SendRequest } from './generated/models.js';

async function main() {
	// Create a new version of the generated connector
	let initialized = false;
	const { resolve, reject, promise } = newPromiseWithResolver<void>();
	const connector = new WsConnector({
		errorHandler: (err: Error) => {
			console.log('error with client:', err);

			// We have to do this here because we're not making a UI, normally this wouldn't be so hard
			if (!initialized) {
				reject(err);
			}

			return 'Something went wrong!';
		},
		requestTimeout: 5000,
		onOpen: () => {
			resolve();
		},
	});

	try {
		connector.connect('ws://localhost:6121/ws');
		await promise; // Wait till connected
		console.log('Connected to server.');
	} catch (err) {
		console.error(`failed to connect to server: ${err}`);
		process.exit(1);
	}

	// When the server sends a message, print it above the prompt so it doesn't overlap with readline input
	connector.onMessage((event) => {
		const time = new Date(Number(event.timestamp)).toLocaleTimeString();
		readline.cursorTo(process.stdout, 0);
		readline.clearLine(process.stdout, 0);
		console.log(`[${time}] ${event.sender}: ${event.text}`);
		rl.prompt(true);
	});

	// Setup console interface
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: '> ',
	});

	rl.prompt();

	console.log('Type "exit" to quit the program.');

	// Require a name before messages can be sent
	let name: string | null = null;
	rl.question('Enter your name: ', (answer) => {
		const trimmed = answer.trim();
		if (trimmed === '') {
			console.log('Name can not be empty.');
			rl.prompt();
			return;
		}
		name = trimmed;
		console.log(`Hello ${name}, you can now send messages.`);
		rl.prompt();
	});

	rl.on('line', (line) => {
		const input = line.trim();

		// Still waiting for a valid name
		if (name === null) {
			if (input === '') {
				console.log('Name can not be empty.');
				rl.prompt();
				return;
			}
			name = input;
			console.log(`Hello ${name}, you can now send messages.`);
			rl.prompt();
			return;
		}

		if (input === 'exit') {
			connector.close();
			rl.close();
			return;
		}

		if (input === '') {
			rl.prompt();
			return;
		}

		// Send the message to the server
		const req: SendRequest = {
			sender: name,
			text: input,
		};
		connector.send(req).then((err) => {
			if (err) {
				console.log('Failed to send message:', err.message);
			}
			rl.prompt();
		});
	});

	rl.on('close', () => {
		console.log('Shutting down chat client.');
		process.exit(0);
	});
}

main();
