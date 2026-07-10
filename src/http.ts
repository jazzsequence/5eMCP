import { createServer as createHttpServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";
import { startRefreshLoop } from "./manifest/refresh.js";

const port = Number(process.env.PORT ?? 3000);

/** Optional shared-secret auth for the HTTP endpoint. If unset, the endpoint is
 *  open to anyone who can reach it — fine behind a private network / VPN, not
 *  recommended for a public-facing deployment. Read lazily (not at module load)
 *  so tests can toggle it via process.env. */
function authToken(): string | undefined {
  const value = process.env.MCP_HTTP_TOKEN;
  return value && value.trim() !== "" ? value : undefined;
}

export function jsonRpcError(res: ServerResponse, status: number, code: number, message: string): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null }));
}

export function isAuthorized(req: IncomingMessage): boolean {
  const token = authToken();
  if (!token) return true;
  return req.headers.authorization === `Bearer ${token}`;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return undefined;
  return JSON.parse(raw);
}

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!isAuthorized(req)) {
    jsonRpcError(res, 401, -32001, "Unauthorized");
    return;
  }

  if (req.method !== "POST") {
    // Stateless mode: no server-initiated streams, so GET/DELETE aren't supported.
    jsonRpcError(res, 405, -32000, "Method not allowed. Use POST.");
    return;
  }

  let parsedBody: unknown;
  try {
    parsedBody = await readJsonBody(req);
  } catch {
    jsonRpcError(res, 400, -32700, "Parse error");
    return;
  }

  try {
    const mcpServer = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void mcpServer.close();
    });
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, parsedBody);
  } catch (err) {
    console.error("Error handling MCP request:", err);
    if (!res.headersSent) {
      jsonRpcError(res, 500, -32603, "Internal server error");
    }
  }
}

/** Builds the HTTP server without starting it — used both by main() and by tests. */
export function createHttpApp(): Server {
  return createHttpServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "5eMCP" }));
      return;
    }

    if (url.pathname === "/mcp") {
      void handleMcpRequest(req, res);
      return;
    }

    jsonRpcError(res, 404, -32000, "Not found");
  });
}

function isMainModule(): boolean {
  return import.meta.url === `file://${process.argv[1]}`;
}

if (isMainModule()) {
  startRefreshLoop();

  const httpServer = createHttpApp();
  httpServer.listen(port, () => {
    console.log(`5eMCP running (Streamable HTTP) on port ${port}, endpoint: /mcp`);
    if (!authToken()) {
      console.warn(
        "MCP_HTTP_TOKEN is not set — the /mcp endpoint is UNAUTHENTICATED. " +
          "Anyone who can reach this port can use the server. " +
          "Set MCP_HTTP_TOKEN to require a Bearer token, or restrict network access.",
      );
    }
  });

  process.on("SIGINT", () => {
    httpServer.close(() => process.exit(0));
  });
}
