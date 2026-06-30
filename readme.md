# Neoroute-TS

## Examples

This repository contains two interactive command-line examples to test the `@liphium/neoroute-client` TypeScript library. These clients are designed to communicate with a local Neoroute Go server running on port `6121`.

### Prerequisites

Before running the examples, ensure you have the following ready:

1. **Node.js** (v18 or higher recommended).
2. The corresponding **[Neoroute Example Server](https://github.com/Liphium/neoroute/tree/main/examples)** must be running locally (`go run .`).
3. The main library (`@liphium/neoroute-ts-client`) must be built. If you make changes to the core library, simply run `npm run build` in the base directory. The examples use a local symlink and will automatically use the updated build.

---

### 1. WebSocket Client (`examples/web_socket_client`)

This client tests the persistent WebSocket connection, event listening, and basic request/response flows.

#### Setup & Run

Navigate to the WebSocket client directory and install the dependencies:

```bash
cd examples/web_socket_client
npm install
npx tsx src/main.ts
```

---

### 2. HTTP Client (`examples/http_client`)

This client tests the stateless HTTP transporter, routing groups, and middleware authentication (token validation via URL parameters).

#### Setup & Run

Navigate to the WebSocket client directory and install the dependencies:

```bash
cd examples/http_client
npm install
npx tsx src/main.ts
```

## Development Note

Both clients use `tsx` to execute the TypeScript files directly without a manual compilation step.
