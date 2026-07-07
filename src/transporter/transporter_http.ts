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

				const arrayBuffer = await response.arrayBuffer();
				const bodyBytes = new Uint8Array(arrayBuffer);

				// Check for transporter errors
				if (!response.ok) {
					const decoder = new TextDecoder();
					throw new Error(
						`received non ok status ${response.status} ${response.statusText}: ${decoder.decode(bodyBytes)}`,
					);
				}

				// Let sender handle the response routing
				setTimeout(() => {
					this.sender.handle(bodyBytes);
				}, 0);
			} finally {
				clearTimeout(timeout);
			}
		});
	}
}
