// Incoming messages

export const MessageTypeResponse = 0;
export const MessageTypeEvent = 1;

export interface Message {
	type: number; // Response or event
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
