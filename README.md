# Neoroute TypeScript Client

This is the official library to interact with a server written with [Neoroute](https://github.com/Liphium/neoroute) in Golang. This library is basically a direct port of the Go client library, with a few modifications to make it fit TS syntax.

## Features

- Written in modern TypeScript using only Browser APIs
- WebSocket Transporter Support
- HTTP Transporter Support
- Basically equivalent to the [offical Go client](https://github.com/Liphium/neoroute/tree/main/client)
- Code generation support via `neogen` (documentation available soon)

## Documentation

Will follow as soon as the main documentation for the server is done. You might not want to use `neoroute-ts` at this point as a lot is still subject to change.

## Examples

This repository contains two interactive command-line examples to test this library that are equivalent to the two client examples over in the [main Neoroute repository](https://github.com/Liphium/neoroute/tree/main/examples/).

### HTTP Client (`examples/http_client`)

This client tests the stateless HTTP transporter, routing groups, and middleware authentication (token validation via URL parameters). To start it use the following command:

```sh
pnpm install && pnpm start
```

We use `pnpm` in this repository. It should also work with `npm`, but please use `pnpm` to ensure compatability.

### WebSocket Client (`examples/web_socket_client`)

This client tests the persistent WebSocket connection, event listening, and basic request/response flows. To start it use the following command:

```sh
pnpm install && pnpm start
```

We use `pnpm` in this repository. It should also work with `npm`, but please use `pnpm` to ensure compatability.
