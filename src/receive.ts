import { decode } from '@msgpack/msgpack';
import { Receiver } from './receiver.js';
import { logger } from './logger.js';
import { Ctx } from './client.js';

export function receive<E>(
	r: Receiver,
	eventName: string,
	handleFunc: (c: Ctx, data: E) => void,
): void {
	r.setEvent(eventName, (c: Ctx) => {
		try {
			const data = decode(c.data()) as E;
			handleFunc(c, data);
		} catch (error) {
			logger.info('failed to unmarshal event data', error);
		}
	});
}
