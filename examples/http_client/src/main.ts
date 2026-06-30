import { Receiver, HTTPTransporter } from '@liphium/neoroute-ts';
import { testHttpSimple, testHttpGroup1, testHttpGroup2 } from './requests.js';
import readline from 'node:readline';

async function main() {
	// 1. Setup Receiver
	const httpReceiver = new Receiver({
		errorHandler: (err: Error) =>
			console.log('Global HTTP receiver error:', err),
		requestTimeout: 5000,
	});

	// 2. Setup HTTP Transporter with the required auth token
	const httpTransporter = new HTTPTransporter(
		httpReceiver,
		'POST',
		'http://localhost:6121/?token=secret_token',
	);
	console.log('HTTP Transporter initialized and ready.');

	// 3. Setup console interface
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: '> ',
	});

	console.log('\n--- HTTP Client Commands ---');
	console.log("1: Test 'simple.route'");
	console.log("2: Test 'group1.route1'");
	console.log("3: Test 'group1.group2.route1'");
	console.log('exit: Quit the program');
	console.log('----------------------------\n');
	rl.prompt();

	rl.on('line', (line) => {
		const input = line.trim();

		if (input === '1') {
			testHttpSimple(httpReceiver).then(() => rl.prompt());
		} else if (input === '2') {
			testHttpGroup1(httpReceiver, 10).then(() => rl.prompt());
		} else if (input === '3') {
			testHttpGroup2(httpReceiver, 42).then(() => rl.prompt());
		} else if (input === 'exit') {
			rl.close();
		} else {
			console.log('Unknown command.');
			rl.prompt();
		}
	});

	rl.on('close', () => {
		console.log('Shutting down HTTP client.');
		process.exit(0);
	});
}

main();
