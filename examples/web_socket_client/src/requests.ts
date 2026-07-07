import { Receiver, UserError } from '@liphium/neoroute-ts';
import {
	type SubmitPunRequest,
	type EchoRequest,
	type EchoResponse,
} from './messages.js';

export async function sendSubmitPunRequest(
	receiver: Receiver,
	pun: string,
): Promise<void> {
	try {
		const requestPayload: SubmitPunRequest = { pun: pun };

		// sendOk throws an error if it fails, otherwise it's successful
		const res = await receiver.sendOk<SubmitPunRequest>(
			'submit_pun',
			requestPayload,
		);
		if (res instanceof UserError) {
			console.log("Couldn't submit pun because:", res.message);
			return;
		}

		console.log('Pun submitted successfully!');
	} catch (err) {
		console.log('Failed to send submit pun request:', err);
	}
}

export async function sendEchoRequest(
	receiver: Receiver,
	message: string,
): Promise<void> {
	try {
		const requestPayload: EchoRequest = { message: message };

		const res = await receiver.send<EchoResponse, EchoRequest>(
			'echo',
			requestPayload,
		);
		if (res instanceof UserError) {
			console.log('Echo failed because:', res.message);
			return;
		}

		console.log(`Received ${res.requestNumber}. echo: ${res.message}`);
	} catch (err) {
		console.log('Failed to send echo request:', err);
	}
}
