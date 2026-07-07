import { decode, encode } from '@msgpack/msgpack';
import {
	type Message,
	type Response,
	type Request,
	MessageType,
} from './interfaces.js';
import { logger } from './logger.js';
import type { Config } from './config.js';
import {
	marshalRequestData,
	unmarshalResponseData,
	withTimeout,
} from './util.js';
import { UserError } from './user_error.js';

export class Sender {
	private config: Config;
	private sendFunc?: (data: Uint8Array) => Promise<void>;
	private requestId: number = 0;

	// Maps a request ID to a resolve function to fulfill the promise
	private waiters: Map<number, (resp: Response) => void> = new Map();

	constructor(config: Config) {
		this.config = config;
		if (!this.config.requestTimeout) {
			this.config.requestTimeout = 5000; // default timeout 5 seconds
		}
	}

	public getRequestId(): number {
		this.requestId++;
		return this.requestId;
	}

	public setSendFunc(sendFunc: (data: Uint8Array) => Promise<void>): void {
		this.sendFunc = sendFunc;
	}

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
		} else {
			this.handleOther(message);
		}
	}

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

	protected handleOther(message: Message): void {
		logger.info('received unsupported message type', message.type);
	}

	public removeResponseWaiter(requestId: number): void {
		this.waiters.delete(requestId);
	}

	private async sendRequest(
		route: string,
		reqData: Uint8Array,
		wantResponse: boolean,
	): Promise<{ promise: Promise<Response>; reqId: number }> {
		const reqId = this.getRequestId();

		if (!this.sendFunc) {
			throw new Error('sendFunc is not set');
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
			throw new Error(`failed to marshal request: ${err}`);
		}

		let respPromise: Promise<Response> = Promise.resolve({} as Response);
		if (wantResponse) {
			respPromise = new Promise<Response>((resolve) => {
				this.waiters.set(reqId, resolve);
			});
		}

		await this.sendFunc(reqBytes);
		return { promise: respPromise, reqId: reqId };
	}

	public getConfig(): Config {
		return this.config;
	}

	/// Internal helper for making send functions easier to write.
	private async sendInternal<RQ, RS>(
		route: string,
		req: RQ,
		waitForResponse: boolean,
		hasResponse: boolean,
	): Promise<RS | UserError | undefined> {
		const { promise: respPromise, reqId } = await this.sendRequest(
			route,
			req != undefined ? marshalRequestData<RQ>(req) : new Uint8Array(),
			true,
		);

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

	public send<RS, RQ>(route: string, req: RQ): Promise<RS | UserError> {
		return this.sendInternal<RQ, RS>(route, req, true, true) as Promise<
			RS | UserError
		>;
	}

	public sendOk<RQ>(route: string, req: RQ): Promise<UserError> {
		return this.sendInternal<RQ, unknown>(
			route,
			req,
			true,
			false,
		) as Promise<UserError>;
	}

	public async sendOkNoRequest(route: string): Promise<UserError> {
		return this.sendInternal(
			route,
			undefined,
			false,
			false,
		) as Promise<UserError>;
	}

	public async sendNoRequest<RS>(route: string): Promise<RS | UserError> {
		return this.sendInternal<undefined, RS>(
			route,
			undefined,
			true,
			true,
		) as Promise<RS | UserError>;
	}

	public async sendNoResponse<RQ>(route: string, req: RQ): Promise<void> {
		await this.sendInternal<RQ, undefined>(route, req, false, false);
	}

	public async sendPing(route: string): Promise<void> {
		await this.sendInternal(route, undefined, false, false);
	}
}
