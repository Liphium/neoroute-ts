import type { Sender } from '../sender.js';

export class HTTPTransporter {
	private sender: Sender;

	constructor(s: Sender, method: string, url: string) {
		this.sender = s;

		this.sender.setSendFunc(async (data: Uint8Array): Promise<void> => {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 20000);

			try {
				const response = await fetch(url, {
					method: method,
					body: data as unknown as BodyInit,
					signal: controller.signal,
					headers: {
						'Content-Type': 'application/octet-stream',
					},
				});

				// Check for transporter errors
				if (!response.ok) {
					throw new Error(
						`received non ok status ${response.status} ${response.statusText}`,
					);
				}

				// Let sender handle the response routing
				this.sender.handle(await response.bytes());
			} finally {
				clearTimeout(timeout);
			}
		});
	}
}
