import { logger } from '../logger.js';
import type { Receiver } from '../receiver.js';

export interface WebSocketOptions {
	// Timeout for the initial connection attempt, default is 20 seconds.
	connectionTimeout?: number;

	// When the connection actually opens.
	onOpen?: () => void;
}

export class WebSocketTransporter {
	private conn: WebSocket | null = null;
	private receiver: Receiver;
	private options: WebSocketOptions;
	private connected: boolean = false;
	private queue: Uint8Array[] = [];

	constructor(receiver: Receiver, options: WebSocketOptions) {
		this.receiver = receiver;
		this.options = options;
	}

	/// Will start a connection to the server. Will not block until the connection is open.
	///
	/// All things sent before the connection is open are queued, so feel free to send already after calling connect.
	public connect(url: string) {
		if (this.connected || this.conn) {
			return;
		}

		// Queue outgoing messages until connection is open
		this.receiver.setSendFunc(async (data: Uint8Array): Promise<void> => {
			if (this.connected && this.conn?.readyState === WebSocket.OPEN) {
				this.conn.send(data as any); // TODO: Find out if this is actually fine xd
			} else {
				this.queue.push(data);
			}
		});

		// Add a timeout to make sure the connection actually happens
		const timeout = setTimeout(() => {
			if (this.conn?.readyState !== WebSocket.OPEN) {
				this.close('connection timeout');
			}
		}, this.options.connectionTimeout ?? 20000);

		// Init WebSocket to open the actual connection
		this.conn = new WebSocket(url);
		this.conn.binaryType = 'arraybuffer';

		this.conn.onopen = () => {
			if (!this.conn) return;

			clearTimeout(timeout);
			this.connected = true;

			// Call onOpen callback
			this.options.onOpen?.();

			// Flush queue
			while (this.queue.length > 0) {
				const data = this.queue.shift();
				if (data) {
					this.conn.send(data as any);
				}
			}
		};

		// When there is an error, we immediately disconnect
		this.conn.onerror = () => {
			if (this.conn) {
				this.close('websocket error');
			}
		};

		// Even on a close, we want to quickly close the thingy to notify the event handler for onError and update internal state
		this.conn.onclose = (event) => {
			if (this.conn) {
				this.close(
					`websocket connection closed: ${event.code} ${event.reason}`,
				);
			}
		};

		// Forward messages to the receiver
		this.conn.onmessage = (event) => {
			if (event.data instanceof ArrayBuffer) {
				this.receiver.handle(new Uint8Array(event.data));
			} else {
				// If we get this, the browser is doing something weird
				logger.error('wrong message type received:', typeof event.data);
				this.close('wrong kind of message received');
			}
		};
	}

	/// Closes the connection to the server. Will not throw if the connection is already closed.
	public close(reason: string = 'Connection closed'): void {
		const wasConnected = this.connected || !!this.conn;
		this.connected = false;
		if (this.conn) {
			const c = this.conn;
			this.conn = null;
			c.close(1000, reason);
		}
		if (wasConnected) {
			this.receiver.getConfig().errorHandler(new Error(reason));
		}
	}

	public isConnected(): boolean {
		return this.connected;
	}
}
