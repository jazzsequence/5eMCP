import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPrompts, PROMPT_TEXT } from "./tools/prompts.js";
import { registerHelpTool } from "./tools/help.js";
import { registerMetaTools } from "./tools/meta.js";
import { registerPassthroughTools } from "./tools/passthrough.js";
import { registerTypedTools } from "./tools/typed.js";
import { registerOmnisearchTool } from "./tools/omnisearch.js";
import { registerBookContentTool } from "./tools/book-content.js";
import { registerCalculatorTools } from "./tools/calculators.js";

export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: "5eMCP",
      version: "1.2.0",
    },
    { instructions: PROMPT_TEXT },
  );

  registerPrompts(server);
  registerHelpTool(server);
  registerMetaTools(server);
  registerPassthroughTools(server);
  registerTypedTools(server);
  registerOmnisearchTool(server);
  registerBookContentTool(server);
  registerCalculatorTools(server);

  return server;
}
