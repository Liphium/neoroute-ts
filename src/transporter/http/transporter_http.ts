import { Sender } from "../../sender";

class AsyncMutex {
    private queue: Promise<void> = Promise.resolve();

    async runExclusive<t>(task: () => Promise<t>): Promise<t> {
        let resolveNext!: () => void;
        const next = new Promise<void>(resolve => {
            resolveNext = resolve;
        });
        const current = this.queue;
        this.queue = this.queue.then(() => next);
        
        await current;
        try {
            return await task();
        } finally {
            resolveNext();
        }
    }
}

export class HTTPTransporter {
    private sender: Sender;
    private sendMutex: AsyncMutex;

    constructor(s: Sender, method: string, url: string) {
        this.sender = s;
        this.sendMutex = new AsyncMutex();

        this.sender.setSendFunc(async (data: Uint8Array): Promise<void> => {
            return this.sendMutex.runExclusive(async () => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 20000);

                try {
                    const response = await fetch(url, {
                        method: method,
                        body: data as unknown as BodyInit,
                        signal: controller.signal,
                        headers: {
                            "Content-Type": "application/octet-stream"
                        }
                    });

                    const arrayBuffer = await response.arrayBuffer();
                    const bodyBytes = new Uint8Array(arrayBuffer);
                    
                    // Check for transporter errors
                    if (!response.ok) {
                        const decoder = new TextDecoder();
                        throw new Error(`received non ok status ${response.status} ${response.statusText}: ${decoder.decode(bodyBytes)}`);
                    }

                    // Let sender handle the response routing
                    setTimeout(() => {
                        this.sender.handle(bodyBytes);
                    }, 0);
                } finally {
                    clearTimeout(timeout);
                }
            });
        });
    }
}