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
