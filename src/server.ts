import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMetaTools } from "./tools/meta.js";
import { registerPassthroughTools } from "./tools/passthrough.js";
import { registerTypedTools } from "./tools/typed.js";
import { registerOmnisearchTool } from "./tools/omnisearch.js";
import { registerBookContentTool } from "./tools/book-content.js";
import { registerCalculatorTools } from "./tools/calculators.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "5eMCP",
    version: "1.0.0",
  });

  registerMetaTools(server);
  registerPassthroughTools(server);
  registerTypedTools(server);
  registerOmnisearchTool(server);
  registerBookContentTool(server);
  registerCalculatorTools(server);

  return server;
}
