import * as readline from 'node:readline';
import { HttpConnector } from './generated/connector_http.js';
import type { SendRequest } from './generated/models.js';

// Setup generated connector
const connector = new HttpConnector(
	{
		errorHandler: (err: Error) => {
			console.log('error with client:', err);
			return 'Something went wrong!';
		},
		requestTimeout: 5000,
	},
	'POST',
	'http://localhost:6121/http',
);

// Setup console interface
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	prompt: '> ',
});

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
