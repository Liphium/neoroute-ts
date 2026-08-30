## Chat client WebSocket example

This example was ported over from the Go client SDK, connecting to the [chat server we have over there](https://github.com/Liphium/neoroute/tree/main/examples/chat_server). Don't worry we show you how to start the server here without going over there.

You can look at the code to get an idea how the two SDKs differ, but there is actually not a lot of difference between the two.

### Running the server

To run the server, you need to have `go` installed. You can install it [here](https://go.dev/dl).

1. Clone the server repository:

```sh
git clone https://github.com/Liphium/neoroute
```

2. In the cloned repository folder, run the following command:

```sh
cd examples/chat_server && go run .
```

### Running the example

> [!NOTE]
> We use `pnpm` in this project. For all of the examples to properly work we recommend you install it first.

First install the dependencies:

```sh
pnpm install
```

Then start the chat client:

```sh
pnpm start
```

This one can only send messages, so it's not really all too exciting.

When you send messages, you should be able to view them in the console of your server.

### Code generation

If you have [neogen](https://liphium.dev/neoroute/utility/neogen) installed, you can run the following command to re-generate the connector for this repository:

```sh
pnpm generate
```

While we got code generation to work with this example, the way we integrated here is **not recommended**. We have a `schema.json` file that provides the schema here, because the server code is in a different repository and example entirely.

For real servers, when you have different repositories, it's probably a good way to find some kind of standard relative path where the server can always be found.
