import type { Sender } from '../sender.js';

export class HTTPTransporter {
	private sender: Sender;

	constructor(s: Sender, method: string, url: string) {
		this.sender = s;

		this.sender.setSendFunc(async (data: Uint8Array): Promise<void> => {
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
			this.sender.handle(await response.bytes());
		});
	}
}
