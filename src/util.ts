import { decode, encode } from '@msgpack/msgpack';

// Creates a promise that can be resolved or rejected externally. This is useful for creating a promise that can be resolved or rejected at a later time, such as when waiting for an event to occur.
export function newPromiseWithResolver<T>(): {
	resolve: (value: T | PromiseLike<T>) => void;
	reject: (reason?: any) => void;
	promise: Promise<T>;
} {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: any) => void;

	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { resolve, reject, promise };
}

// Helper to create a timeout promise
export function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	onTimeout?: () => void,
): Promise<T> {
	let timeoutId: ReturnType<typeof setTimeout>;
	const timeoutPromise = new Promise<T>((_, reject) => {
		timeoutId = setTimeout(() => {
			onTimeout?.();
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

export function marshalRequestData<RQ>(req: RQ): Uint8Array {
	try {
		return encode(req);
	} catch (error) {
		throw new Error(`failed to marshal request data: ${error}`);
	}
}

export function unmarshalResponseData<RS>(respBytes: Uint8Array): RS {
	try {
		return decode(respBytes) as RS;
	} catch (error) {
		throw new Error(`failed to unmarshal response data: ${error}`);
	}
}
