import { decode as decodeMessagePack, ExtensionCodec } from "@msgpack/msgpack";

const extensionCodec = new ExtensionCodec();

// msgp's default time.Time encoding uses extension 5: int64 seconds followed by int32 nanoseconds, both big-endian. Standard timestamps (-1) remain supported.
extensionCodec.register({
  type: 5,
  encode: () => null,
  decode: (data) => {
    if (data.byteLength !== 12) {
      throw new RangeError("msgp time extension must contain 12 bytes");
    }
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const seconds = view.getBigInt64(0);
    const nanoseconds = view.getUint32(8);
    if (nanoseconds >= 1_000_000_000) {
      throw new RangeError("msgp time nanoseconds must be less than 1000000000");
    }
    // JavaScript Date stores milliseconds, so finer precision is discarded.
    const date = new Date(Number(seconds) * 1000 + Math.floor(nanoseconds / 1_000_000));
    if (Number.isNaN(date.getTime())) {
      throw new RangeError("msgp time is outside the JavaScript Date range");
    }
    return date;
  },
});

export function decode(data: Uint8Array): unknown {
  return decodeMessagePack(data, { extensionCodec });
}
