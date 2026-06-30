import { logger } from '../logger.js';
import type { Receiver } from '../receiver.js';

export class WebSocketTransporter {
	private conn: WebSocket | null = null;
	private receiver: Receiver;

	private sendMutex: Promise<void> = Promise.resolve();

	constructor(r: Receiver) {
		this.receiver = r;
	}

	public connect(url: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			try {
				// INIT WebSocket. Using the native web api.
				this.conn = new WebSocket(url);
				this.conn.binaryType = 'arraybuffer';

				const timeoutId = setTimeout(() => {
					if (this.conn?.readyState !== WebSocket.OPEN) {
						this.conn?.close();
						reject(
							new Error(
								'failed to connect to websocket server: connection timeout',
							),
						);
					}
				}, 20000);

				this.conn.onopen = () => {
					clearTimeout(timeoutId);

					this.receiver.setSendFunc(
						async (data: Uint8Array): Promise<void> => {
							// Mimic the Mutex lock
							this.sendMutex = this.sendMutex.then(async () => {
								return new Promise<void>((res, rej) => {
									if (
										!this.conn ||
										this.conn.readyState !== WebSocket.OPEN
									) {
										return rej(
											new Error(
												'websocket connection is not open',
											),
										);
									}
									this.conn.send(
										data as unknown as BufferSource,
									);
									res();
								});
							});
							return this.sendMutex;
						},
					);
					resolve();
				};

				this.conn.onerror = (event) => {
					clearTimeout(timeoutId);
					reject(
						new Error(
							`failed to connect to websocket server or an error occurred`,
						),
					);
				};

				this.conn.onclose = (event) => {
					logger.info(
						'websocket connection closed by remote',
						event.code,
						event.reason,
					);
				};

				this.conn.onmessage = async (event) => {
					let msg: Uint8Array;

					if (event.data instanceof ArrayBuffer) {
						msg = new Uint8Array(event.data);
					} else if (
						typeof Blob !== 'undefined' &&
						event.data instanceof Blob
					) {
						const arrayBuffer = await event.data.arrayBuffer();
						msg = new Uint8Array(arrayBuffer);
					} else if (event.data && event.data.buffer) {
						msg = new Uint8Array(
							event.data.buffer,
							event.data.byteOffset,
							event.data.byteLength,
						);
					} else {
						logger.info(
							'wrong message type received:',
							typeof event.data,
						);
						return;
					}

					// Let receiver handle message asynchronously
					setTimeout(() => {
						this.receiver.handle(msg);
					}, 0);
				};
			} catch (error) {
				reject(
					new Error(
						`failed to connect to websocket server: ${error}`,
					),
				);
			}
		});
	}

	public close(): void {
		if (this.conn) {
			this.conn.close(1000, 'client closed connection');
			this.conn = null;
		}
	}
}
