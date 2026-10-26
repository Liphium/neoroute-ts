import { decode, encode } from '@msgpack/msgpack';
import {
	type Message,
	type Response,
	MessageType,
	type Event,
	type Request,
} from './interfaces.js';
import { logger } from './logger.js';
import type { Config, RequestOptions } from './config.js';
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
	private requestId = 0;
	private receiver: Map<string, (c: Ctx) => void> = new Map();
	private waiters: Map<number, (resp: Response) => void> = new Map();

	constructor(config: Config) {
		this.config = {
			...config,
			requestTimeout: config.requestTimeout ?? 5000,
		};
	}

	public setSendFunc(sendFunc: (data: Uint8Array) => Promise<void>): void {
		this.sendFunc = sendFunc;
	}

	public getConfig(): Config {
		return this.config;
	}

	private async sendInternal<RQ, RS>(
		route: string,
		req: RQ,
		waitForResponse: boolean,
		hasResponse: boolean,
		options?: RequestOptions,
	): Promise<RS | UserError | undefined> {
		const reqId = ++this.requestId;
		try {
			if (!this.sendFunc) throw new Error('sendFunc is not set');
			const body =
				req !== undefined ? marshalRequestData(req) : new Uint8Array();
			// The ordered tuple lets the server inspect the route and binary body length before reading the body and applying its route size limit.
			const request: Request = [reqId, route, body];
			const bytes = encode(request);
			let response: Promise<Response> | undefined;
			if (waitForResponse) {
				response = new Promise<Response>((resolve) =>
					this.waiters.set(reqId, resolve),
				);
			}
			const send = this.sendFunc;
			const operation = async () => {
				await send(bytes);
				if (!response) return undefined;
				const res = await response;
				if (res.error)
					return new UserError(new TextDecoder().decode(res.data));
				return hasResponse
					? unmarshalResponseData<RS>(res.data)
					: undefined;
			};
			return await withTimeout(
				operation(),
				options?.requestTimeout ?? this.config.requestTimeout ?? 5000,
			);
		} catch (error) {
			return new UserError(
				this.config.errorHandler(
					error instanceof Error ? error : new Error(String(error)),
				),
			);
		} finally {
			this.waiters.delete(reqId);
		}
	}

	/// Send a request and return its response or a UserError. Does not throw.
	public send<RS, RQ>(
		route: string,
		req: RQ,
		options?: RequestOptions,
	): Promise<RS | UserError> {
		return this.sendInternal<RQ, RS>(
			route,
			req,
			true,
			true,
			options,
		) as Promise<RS | UserError>;
	}

	/// Send a request and wait for success or a UserError. Does not throw.
	public sendOk<RQ>(
		route: string,
		req: RQ,
		options?: RequestOptions,
	): Promise<UserError | undefined> {
		return this.sendInternal<RQ, never>(route, req, true, false, options);
	}

	/// Send without request data and wait for success or a UserError. Does not throw.
	public sendOkNoRequest(
		route: string,
		options?: RequestOptions,
	): Promise<UserError | undefined> {
		return this.sendInternal<undefined, never>(
			route,
			undefined,
			true,
			false,
			options,
		);
	}

	/// Send without request data and return its response or a UserError. Does not throw.
	public sendNoRequest<RS>(
		route: string,
		options?: RequestOptions,
	): Promise<RS | UserError> {
		return this.sendInternal<undefined, RS>(
			route,
			undefined,
			true,
			true,
			options,
		) as Promise<RS | UserError>;
	}

	/// Send without waiting for a response. Errors go to the configured error handler.
	public async sendNoResponse<RQ>(
		route: string,
		req: RQ,
		options?: RequestOptions,
	): Promise<void> {
		await this.sendInternal<RQ, never>(route, req, false, false, options);
	}

	/// Send without request data or waiting for a response.
	public async sendPing(
		route: string,
		options?: RequestOptions,
	): Promise<void> {
		await this.sendInternal<undefined, never>(
			route,
			undefined,
			false,
			false,
			options,
		);
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
