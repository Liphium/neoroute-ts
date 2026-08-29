# Neoroute TypeScript Client

This is the official library to interact with a server written with [Neoroute](https://github.com/Liphium/neoroute) in Golang. This library is basically a direct port of the Go client library, with a few modifications to make it fit TS syntax.

## Features

- Written in modern TypeScript using only Browser APIs
- Supports [WebSocket](https://liphium.dev/neoroute/client/websocket) and [HTTP](https://liphium.dev/neoroute/client/http) transporters
- Basically equivalent to the [offical Go client](https://github.com/Liphium/neoroute/tree/main/client)
- Code generation support via `neogen` (learn more [here](https://liphium.dev/neoroute/utility/neogen))
- Central error handling without try-catch (This SDK was written by Go developers, what did you expect?)

## Documentation

We have official documentation available at [liphium.dev/neoroute-ts](https://liphium.dev/neoroute-ts).

You can also look into the "Client" category over there. All of the code snippets there also provide TypeScript example code using this SDK.

## Notes

- When sending requests, you do not need to surround them with a try-catch. All errors are first passed to the central error handler in the `Config` object you give to a `Client`. The `string` you return there is packaged into a `UserError`, the object returned by almost all send functions.

## Examples

> [!NOTE]
> We use `pnpm` in this repository. Please use it to make sure the examples work properly.

This repository contains two interactive command-line examples to test this library that are equivalent to the two client examples over in the [main Neoroute repository](https://github.com/Liphium/neoroute/tree/main/examples/).

## Runtime support

We verified that the browser and NodeJS both work without problems in our tests. The only dependency we have is [MessagePack](https://github.com/msgpack/msgpack-javascript), the encoding we use instead of JSON.

Other than that, we use the native Browser APIs like `fetch` and `WebSocket`. For this reason, there should not be any issues. If you still find an environment that has problems or there is something wrong with our SDK, please kindly let us know on [GitHub](https://github.com/Liphium/neoroute-ts/issues).
