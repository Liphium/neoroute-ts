// Incoming messages

export enum MessageType {
	Response,
	Event,
}

export interface Message {
	type: MessageType; // Response or event
	data: Uint8Array;
}

export interface Event {
	name: string;
	data: Uint8Array;
}

export interface Response {
	id: number;
	has_data: boolean;
	error: boolean;
	data: Uint8Array;
}

// Outgoing messages

export interface Request {
	id: number;
	route: string;
	data: Uint8Array;
}
