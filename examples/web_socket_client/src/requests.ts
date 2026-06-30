import { Receiver, sendOk, send, UserError } from "@liphium/neoroute-client";
import { SubmitPunRequest, EchoRequest, EchoResponse } from "./messages";

export async function sendSubmitPunRequest(r: Receiver, pun: string): Promise<void> {
    try {
        const requestPayload: SubmitPunRequest = { pun: pun };
        
        // sendOk throws an error if it fails, otherwise it's successful
        await sendOk<SubmitPunRequest>(r, "submit_pun", requestPayload);
        console.log("Pun submitted successfully!");

    } catch (err) {
        if (err instanceof UserError) {
            console.log("Couldn't submit pun because:", err.message);
        } else {
            console.log("Failed to send submit pun request:", err);
        }
    }
}

export async function sendEchoRequest(r: Receiver, message: string): Promise<void> {
    try {
        const requestPayload: EchoRequest = { message: message };
        
        // send now directly returns the response object
        const resp = await send<EchoResponse, EchoRequest>(r, "echo", requestPayload);
        console.log(`Received ${resp.requestNumber}. echo: ${resp.message}`);

    } catch (err) {
        if (err instanceof UserError) {
            console.log("Echo failed because:", err.message);
        } else {
            console.log("Failed to send echo request:", err);
        }
    }
}