import { Receiver, receive, Ctx } from '@liphium/neoroute-ts';
import { type NewPunEvent } from './messages.js';

export function registerReceiver(r: Receiver): void {
	receive<NewPunEvent>(r, 'new_pun_submitted', (c: Ctx, req: NewPunEvent) => {
		console.log(`A new pun was submitted by someone, it is ${req.pun}`);
	});
}
