import { decode, encode } from "@msgpack/msgpack";
import { Config } from "./config";
import { Event, Message, MessageTypeEvent, MessageTypeResponse, Response, Request } from "./neoroute_structs";
import { logger } from "./logger";
import { Ctx } from "./client";

export interface Sender {
    getRequestId(): number;
    setSendFunc(sendFunc: (data: Uint8Array) => Promise<void>): void;
    handle(reqData: Uint8Array): void
    handleResponse(respBytes: Uint8Array): void;
    handleEvent(eventBytes: Uint8Array): void;
    removeResponseWaiter(requestId: number): void;
    sendRequest(route: string, reqData: Uint8Array, wantResponse: boolean): Promise<{ promise: Promise<Response>, reqId: number }>
    getConfig(): Config;
    setReceiver(eventName: string, receiveFunc: (c: Ctx) => Promise<void>): void;
}

export class DefaultSender implements Sender {
    private config: Config;
    private sendFunc?: (data: Uint8Array) => Promise<void>;
    private requestId: number = 0;

    // Maps a request ID to a resolve function to fulfill the promise
    private waiters: Map<number, (resp: Response) => void> = new Map();
    private receiver: Map<string, (c: Ctx) => void> = new Map();

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
            logger.info("failed to unmarshal message", error);
            return;
        }

        switch (message.type) {
            case MessageTypeEvent:
                this.handleEvent(message.data);
                break;
            case MessageTypeResponse:
                this.handleResponse(message.data);
                break;
            default:
                logger.info("received unsupported message type", message.type);
                return;
        }
    }

    public handleResponse(respBytes: Uint8Array): void {
        let resp: Response;
        try {
            resp = decode(respBytes) as Response;
        } catch (error) {
            logger.info("failed to unmarshal response", error);
            return;
        }

        if (resp.id === -1 && resp.error) {
            const decoder = new TextDecoder();
            this.config.errorHandler(new Error(decoder.decode(resp.data)));
            return;
        }

        const resolveFunc = this.waiters.get(resp.id);
        if (!resolveFunc) {
            logger.info("received response for non existing waiter", resp.id);
            return;
        }

        resolveFunc(resp);
    }

    public handleEvent(eventBytes: Uint8Array): void {
        let ev: Event;
        try {
            ev = decode(eventBytes) as Event;
        } catch (error) {
            logger.info("failed to unmarshal event", error);
            return;
        }

        const receiverFunc = this.receiver.get(ev.name);
        if (!receiverFunc) {
            logger.info("received event for non existing receiver", ev.name);
            return;
        }

        const c = new Ctx(ev.data, ev.name);
        receiverFunc(c);
    }

    public removeResponseWaiter(requestId: number): void {
        this.waiters.delete(requestId);
    }

    public async sendRequest(route: string, reqData: Uint8Array, wantResponse: boolean): Promise<{ promise: Promise<Response>, reqId: number }> {
        const reqId = this.getRequestId();

        if (!this.sendFunc) {
            throw new Error("sendFunc is not set");
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

    public setReceiver(eventName: string, receiveFunc: (c: Ctx) => void): void {
        this.receiver.set(eventName, receiveFunc);
    }
}