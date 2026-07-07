import { Receiver, Ctx } from '@liphium/neoroute-ts';
import { type NewPunEvent } from './messages.js';

export function registerReceiver(receiver: Receiver): void {
	receiver.receive('new_pun_submitted', (_: Ctx, req: NewPunEvent) => {
		console.log(`A new pun was submitted by someone, it is ${req.pun}`);
	});
}
