import { marshalRequestData, unmarshalResponseData } from './send_helper.js';
import type { Sender } from './sender.js';
import { UserError } from './user_error.js';

// Helper to create a timeout promise
function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	onTimeout: () => void,
): Promise<T> {
	let timeoutId: ReturnType<typeof setTimeout>;
	const timeoutPromise = new Promise<T>((_, reject) => {
		timeoutId = setTimeout(() => {
			onTimeout();
			reject(
				new Error(
					`waiting for response timed out after ${timeoutMs}ms`,
				),
			);
		}, timeoutMs);
	});

	return Promise.race([
		promise.finally(() => clearTimeout(timeoutId)),
		timeoutPromise,
	]);
}

export async function send<RS, RQ>(
	r: Sender,
	route: string,
	req: RQ,
): Promise<RS> {
	const reqBytes = marshalRequestData<RQ>(req);

	const { promise: respPromise, reqId } = await r.sendRequest(
		route,
		reqBytes,
		true,
	);

	const timeout = r.getConfig().requestTimeout || 5000;
	const res = await withTimeout(respPromise, timeout, () =>
		r.removeResponseWaiter(reqId),
	);
	r.removeResponseWaiter(reqId);

	if (res.error) {
		const decoder = new TextDecoder();
		throw new UserError(decoder.decode(res.data));
	}

	return unmarshalResponseData<RS>(res.data);
}

export async function sendOk<RQ>(
	r: Sender,
	route: string,
	req: RQ,
): Promise<void> {
	const reqBytes = marshalRequestData<RQ>(req);
	const { promise: respPromise, reqId } = await r.sendRequest(
		route,
		reqBytes,
		true,
	);

	const timeout = r.getConfig().requestTimeout || 5000;
	const res = await withTimeout(respPromise, timeout, () =>
		r.removeResponseWaiter(reqId),
	);
	r.removeResponseWaiter(reqId);

	if (res.error) {
		const decoder = new TextDecoder();
		throw new UserError(decoder.decode(res.data));
	}
}

export async function sendOkNoRequest(r: Sender, route: string): Promise<void> {
	const { promise: respPromise, reqId } = await r.sendRequest(
		route,
		new Uint8Array(),
		true,
	);

	const timeout = r.getConfig().requestTimeout || 5000;
	const res = await withTimeout(respPromise, timeout, () =>
		r.removeResponseWaiter(reqId),
	);
	r.removeResponseWaiter(reqId);

	if (res.error) {
		const decoder = new TextDecoder();
		throw new UserError(decoder.decode(res.data));
	}
}

export async function sendNoRequest<RS>(r: Sender, route: string): Promise<RS> {
	const { promise: respPromise, reqId } = await r.sendRequest(
		route,
		new Uint8Array(),
		true,
	);

	const timeout = r.getConfig().requestTimeout || 5000;
	const res = await withTimeout(respPromise, timeout, () =>
		r.removeResponseWaiter(reqId),
	);
	r.removeResponseWaiter(reqId);

	if (res.error) {
		const decoder = new TextDecoder();
		throw new UserError(decoder.decode(res.data));
	}

	return unmarshalResponseData<RS>(res.data);
}

export async function sendNoResponse<RQ>(
	r: Sender,
	route: string,
	req: RQ,
): Promise<void> {
	const reqBytes = marshalRequestData<RQ>(req);
	await r.sendRequest(route, reqBytes, false);
}

export async function sendNoop(r: Sender, route: string): Promise<void> {
	await r.sendRequest(route, new Uint8Array(), false);
}
