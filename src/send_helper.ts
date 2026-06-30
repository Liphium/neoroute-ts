import { decode, encode } from "@msgpack/msgpack";

export function marshalRequestData<RQ>(req: RQ): Uint8Array {
    try {
        return encode(req);
    } catch (error) {
        throw new Error(`failed to marshal request data: ${error}`);
    }
}

export function unmarshalResponseData<RS>(respBytes: Uint8Array): RS {
    try {
        return decode(respBytes) as RS;
    } catch (error) {
        throw new Error(`failed to unmarshal response data: ${error}`);
    }
}