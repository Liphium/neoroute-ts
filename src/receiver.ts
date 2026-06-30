import type { Ctx } from './client.js';
import type { Config } from './config.js';
import { DefaultSender } from './sender.js';

export class Receiver extends DefaultSender {
	constructor(config: Config) {
		super(config);
	}

	public setEvent(eventName: string, receiveFunc: (c: Ctx) => void): void {
		this.setReceiver(eventName, receiveFunc);
	}
}
