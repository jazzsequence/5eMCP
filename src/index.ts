import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { startRefreshLoop } from "./manifest/refresh.js";

async function main(): Promise<void> {
  const server = createServer();

  // Start background manifest refresh (non-blocking)
  startRefreshLoop();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("5eMCP running (stdio)");
}

main().catch((err: unknown) => {
  console.error("Fatal:", err);
  process.exit(1);
});
