import { decode, encode } from '@msgpack/msgpack';
import {
	type Message,
	type Response,
	type Request,
	MessageType,
	type Event,
} from './interfaces.js';
import { logger } from './logger.js';
import type { Config } from './config.js';
import {
	marshalRequestData,
	unmarshalResponseData,
	withTimeout,
} from './util.js';
import { UserError } from './user_error.js';
import { Ctx } from './context.js';

export class Client {
	private config: Config;
	private sendFunc?: (data: Uint8Array) => Promise<void>;
	private requestId: number = 0;
	private receiver: Map<string, (c: Ctx) => void> = new Map();

	// Maps a request ID to a resolve function to fulfill the promise
	private waiters: Map<number, (resp: Response) => void> = new Map();

	constructor(config: Config) {
		this.config = config;
		if (!this.config.requestTimeout) {
			this.config.requestTimeout = 5000; // default timeout 5 seconds
		}
	}

	public setSendFunc(sendFunc: (data: Uint8Array) => Promise<void>): void {
		this.sendFunc = sendFunc;
	}

	private removeResponseWaiter(requestId: number): void {
		this.waiters.delete(requestId);
	}

	private getRequestId(): number {
		this.requestId++;
		return this.requestId;
	}

	/// Internal helper for sending the actual request.
	private async sendRequest(
		route: string,
		reqData: Uint8Array,
		wantResponse: boolean,
	): Promise<{
		promise: Promise<Response>;
		reqId: number;
		immediateError?: UserError;
	}> {
		const reqId = this.getRequestId();

		if (!this.sendFunc) {
			const msg = this.config.errorHandler(
				new Error('sendFunc is not set'),
			);
			return {
				promise: Promise.resolve({} as Response),
				reqId: -1,
				immediateError: new UserError(msg),
			};
		}

		const req: Request = {
			id: reqId,
			route: route,
			data: reqData,
		};

		let reqBytes: Uint8Array;
		try {
			reqBytes = encode(req);
		} catch (err) {
			const msg = this.config.errorHandler(
				new Error(`failed to marshal request: ${err}`),
			);
			return {
				promise: Promise.resolve({} as Response),
				reqId: -1,
				immediateError: new UserError(msg),
			};
		}

		let respPromise: Promise<Response> = Promise.resolve({} as Response);
		if (wantResponse) {
			respPromise = new Promise<Response>((resolve) => {
				this.waiters.set(reqId, resolve);
			});
		}

		try {
			await this.sendFunc(reqBytes);
		} catch (err) {
			const msg = this.config.errorHandler(
				err instanceof Error ? err : new Error(String(err)),
			);
			return {
				promise: respPromise,
				reqId: reqId,
				immediateError: new UserError(msg),
			};
		}
		return { promise: respPromise, reqId: reqId };
	}

	public getConfig(): Config {
		return this.config;
	}

	/// Internal helper for making send functions easier to write and handling the timeout.
	private async sendInternal<RQ, RS>(
		route: string,
		req: RQ,
		waitForResponse: boolean,
		hasResponse: boolean,
	): Promise<RS | UserError | undefined> {
		const {
			promise: respPromise,
			reqId,
			immediateError,
		} = await this.sendRequest(
			route,
			req != undefined ? marshalRequestData<RQ>(req) : new Uint8Array(),
			true,
		);

		if (immediateError) {
			if (reqId !== -1) this.removeResponseWaiter(reqId);
			return immediateError;
		}

		// When we want to wait for response, properly serialize it
		if (waitForResponse) {
			const timeout = this.config.requestTimeout ?? 5000;
			const res = await withTimeout(respPromise, timeout);
			this.removeResponseWaiter(reqId);

			if (res.error) {
				const decoder = new TextDecoder();
				return new UserError(decoder.decode(res.data));
			}

			if (hasResponse) {
				return unmarshalResponseData<RS>(res.data);
			} else {
				return undefined;
			}
		} else {
			// Otherwise signal that nothing will be waited for
			return undefined;
		}
	}

	/// Send a request to the server, gets a response or UserError back.
	///
	/// This function can not throw any errors.
	public send<RS, RQ>(route: string, req: RQ): Promise<RS | UserError> {
		return this.sendInternal<RQ, RS>(route, req, true, true) as Promise<
			RS | UserError
		>;
	}

	/// Send a request to the server, gets a UserError back in case there is one.
	///
	/// This function can not throw any errors.
	public sendOk<RQ>(route: string, req: RQ): Promise<UserError | undefined> {
		return this.sendInternal<RQ, unknown>(
			route,
			req,
			true,
			false,
		) as Promise<UserError | undefined>;
	}

	/// Send a request with no request data to the server, gets a UserError back in case there is one.
	///
	/// This function can not throw any errors.
	public async sendOkNoRequest(
		route: string,
	): Promise<UserError | undefined> {
		return this.sendInternal(route, undefined, false, false) as Promise<
			UserError | undefined
		>;
	}

	/// Send a request with no request data to the server, gets a response or UserError back.
	///
	/// This function can not throw any errors.
	public async sendNoRequest<RS>(route: string): Promise<RS | UserError> {
		return this.sendInternal<undefined, RS>(
			route,
			undefined,
			true,
			true,
		) as Promise<RS | UserError>;
	}

	/// Send a request with no response to the server.
	///
	/// This function can not throw any errors.
	public async sendNoResponse<RQ>(route: string, req: RQ): Promise<void> {
		await this.sendInternal<RQ, undefined>(route, req, false, false);
	}

	/// Send a ping to the server. This is useful for keeping the connection alive.
	///
	/// This function can not throw any errors.
	public async sendPing(route: string): Promise<void> {
		await this.sendInternal(route, undefined, false, false);
	}

	/// INTERNAL: handles data received from the transport layer. This is called by the transport layer when data is received.
	public handle(reqData: Uint8Array): void {
		let message: Message;
		try {
			message = decode(reqData) as Message;
		} catch (error) {
			logger.info('failed to unmarshal message', error);
			return;
		}

		if (message.type === MessageType.Response) {
			this.handleResponse(message.data);
		} else if (message.type === MessageType.Event) {
			this.handleEvent(message.data);
		} else {
			this.handleOther(message);
		}
	}

	/// INTERNAL: handles a response received from the transport layer.
	public handleResponse(respBytes: Uint8Array): void {
		let resp: Response;
		try {
			resp = decode(respBytes) as Response;
		} catch (error) {
			logger.info('failed to unmarshal response', error);
			return;
		}

		if (resp.id === -1 && resp.error) {
			const decoder = new TextDecoder();
			this.config.errorHandler(new Error(decoder.decode(resp.data)));
			return;
		}

		const resolveFunc = this.waiters.get(resp.id);
		if (!resolveFunc) {
			logger.info('received response for non existing waiter', resp.id);
			return;
		}

		resolveFunc(resp);
	}

	/// INTERNAL: handles an event received from the transport layer.
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

	/// Register a handler function for when an event is received. Only one handleFunc can exist at the same time.
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

	protected handleOther(message: Message): void {
		logger.info('received unsupported message type', message.type);
	}
}
