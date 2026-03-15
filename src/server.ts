import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMetaTools } from "./tools/meta.js";
import { registerPassthroughTools } from "./tools/passthrough.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "5etools-mcp",
    version: "0.1.0",
  });

  registerMetaTools(server);
  registerPassthroughTools(server);

  return server;
}
