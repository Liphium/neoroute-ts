import type { Client } from '../client.js';

export function applyHTTP(client: Client, method: string, url: string) {
	client.setSendFunc(async (data: Uint8Array): Promise<void> => {
		// No need for catching errors here (just for the finally), the error will always be caught in the catch of the sender when calling sendfunc
		const response = await fetch(url, {
			method: method,
			body: data as unknown as BodyInit,
			headers: {
				'Content-Type': 'application/octet-stream',
			},
		});

		// Check for transporter errors
		if (!response.ok) {
			// This will be caught by the catch in the sender (and converted into a user error)
			throw new Error(
				`received non ok status ${response.status} ${response.statusText}`,
			);
		}

		// Let sender handle the response routing
		client.handle(await response.bytes());
	});
}
