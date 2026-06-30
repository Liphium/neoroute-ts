import { Ctx } from "./client";
import { Config } from "./config";
import { DefaultSender } from "./sender";

export class Receiver extends DefaultSender {
    constructor(config: Config) {
        super(config);
    }

    public setEvent(eventName: string, receiveFunc: (c: Ctx) => void): void {
        this.setReceiver(eventName, receiveFunc);
    }
}