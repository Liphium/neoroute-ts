// Incoming messages

export enum MessageType {
  Response,
  Event,
}

export type Message = [
  type: MessageType, // Response or event
  data: Uint8Array,
];

export type Event = [name: string, data: Uint8Array];

export type Response = [id: number, has_data: boolean, error: boolean, data: Uint8Array];

// Outgoing messages

export type Request = [id: number, route: string, data: Uint8Array];
