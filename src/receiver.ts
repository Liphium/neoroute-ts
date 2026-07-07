import { decode } from '@msgpack/msgpack';
import { Ctx } from './client.js';
import type { Config } from './config.js';
import { Sender } from './sender.js';
import { type Event, MessageType, type Message } from './interfaces.js';
import { logger } from './logger.js';

export class Receiver extends Sender {
	private receiver: Map<string, (c: Ctx) => void> = new Map();

	constructor(config: Config) {
		super(config);
	}

	protected override handleOther(message: Message): void {
		if (message.type === MessageType.Event) {
			this.handleEvent(message.data);
		} else {
			super.handleOther(message);
		}
	}

	private handleEvent(eventBytes: Uint8Array): void {
		let ev: Event;
		try {
			ev = decode(eventBytes) as Event;
		} catch (error) {
			logger.info('failed to unmarshal event', error);
			return;
		}

		const receiverFunc = this.receiver.get(ev.name);
		if (!receiverFunc) {
			logger.info('received event for non existing receiver', ev.name);
			return;
		}

		const c = new Ctx(ev.data, ev.name);
		receiverFunc(c);
	}

	/// Handle receiving of an event. Only one handleFunc can exist at the same time.
	public receive<E>(
		eventName: string,
		handleFunc: (c: Ctx, data: E) => void,
	): void {
		this.receiver.set(eventName, (c: Ctx) => {
			try {
				const data = decode(c.data()) as E;
				handleFunc(c, data);
			} catch (error) {
				logger.info('failed to unmarshal event data', error);
			}
		});
	}
}
