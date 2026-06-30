// Outgoing

export interface EchoRequest {
	message: string;
}

export interface SubmitPunRequest {
	pun: string;
}

// Response

export interface EchoResponse {
	requestNumber: number;
	message: string;
}

// Event

export interface NewPunEvent {
	pun: string;
}
