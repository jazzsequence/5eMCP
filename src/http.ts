import { createServer } from "node:http";

const port = process.env.PORT ?? 3000;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>5etools MCP</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #1a1a2e;
      color: #e0e0e0;
      margin: 0;
      padding: 2rem 1rem;
    }
    .container {
      max-width: 700px;
      margin: 0 auto;
    }
    header {
      text-align: center;
      margin-bottom: 3rem;
    }
    h1 {
      font-size: 2.2rem;
      color: #c0392b;
      margin: 0 0 0.4rem;
    }
    .subtitle {
      color: #888;
      font-size: 1rem;
    }
    h2 {
      font-size: 1.1rem;
      color: #aaa;
      border-bottom: 1px solid #333;
      padding-bottom: 0.4rem;
      margin-top: 2.5rem;
    }
    p {
      line-height: 1.7;
      color: #bbb;
    }
    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: -1px;
    }
    .tab {
      padding: 0.4rem 1rem;
      background: #2d2d44;
      border: 1px solid #444;
      border-bottom: none;
      border-radius: 4px 4px 0 0;
      font-size: 0.85rem;
      color: #888;
      cursor: default;
    }
    .tab.active {
      background: #1e1e30;
      color: #7ec8e3;
    }
    pre {
      background: #1e1e30;
      border: 1px solid #444;
      border-radius: 0 4px 4px 4px;
      padding: 1.25rem;
      overflow-x: auto;
      margin: 0 0 1.5rem;
    }
    code {
      font-family: "SF Mono", "Fira Code", monospace;
      font-size: 0.82rem;
      line-height: 1.6;
      color: #c8e6c9;
    }
    .inline {
      background: #2d2d44;
      border-radius: 3px;
      padding: 0.1em 0.4em;
      font-family: monospace;
      font-size: 0.85em;
      color: #7ec8e3;
    }
    .note {
      font-size: 0.85rem;
      color: #777;
      margin-top: 0.5rem;
    }
    a { color: #7ec8e3; }
    .badge {
      display: inline-block;
      background: #2d2d44;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 0.2rem 0.65rem;
      font-size: 0.8rem;
      color: #aaa;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>5etools MCP</h1>
      <div class="subtitle">D&amp;D 5e Model Context Protocol Server</div>
    </header>

    <p>
      A complete D&amp;D 5e reference server for AI assistants. Provides every content type
      5e.tools displays &mdash; spells, monsters, items, classes, sourcebooks, adventures,
      and homebrew &mdash; backed by live 5etools GitHub data. No API key required.
    </p>

    <h2>Install</h2>
    <pre><code>git clone https://github.com/jazzsequence/5eMCP.git
cd 5eMCP
npm install
npm run build</code></pre>

    <h2>Configure your MCP client</h2>
    <p>Replace <span class="inline">/path/to/5eMCP</span> with the absolute path to your clone.</p>

    <div class="tabs">
      <div class="tab active">Claude Desktop</div>
      <div class="tab">Claude Code</div>
      <div class="tab">Cursor</div>
    </div>
    <pre><code>{
  "mcpServers": {
    "5etools": {
      "command": "node",
      "args": ["/path/to/5eMCP/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here",
        "DEFAULT_RULESET": "2024"
      }
    }
  }
}</code></pre>

    <p class="note">
      Config file locations:<br>
      <strong>Claude Desktop</strong> &mdash; <span class="inline">~/Library/Application Support/Claude/claude_desktop_config.json</span> (macOS)<br>
      <strong>Claude Code</strong> &mdash; <span class="inline">~/.claude.json</span><br>
      <strong>Cursor</strong> &mdash; <span class="inline">.cursor/mcp.json</span> (project) or <span class="inline">~/.cursor/mcp.json</span> (global)
    </p>

    <h2>Environment variables</h2>
    <p>
      <span class="inline">GITHUB_TOKEN</span> &mdash; Read-only GitHub PAT. Optional but strongly recommended (5000 req/hr vs 60 unauthenticated).<br>
      <span class="inline">DEFAULT_RULESET</span> &mdash; <span class="inline">"2024"</span> (default) or <span class="inline">"2014"</span> for legacy rules.
    </p>

    <h2>Source</h2>
    <p><a href="https://github.com/jazzsequence/5eMCP">github.com/jazzsequence/5eMCP</a></p>
    <div class="badge">HTTP transport coming in Phase 5</div>
  </div>
</body>
</html>`;

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "5etools-mcp" }));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
});

server.listen(port, () => {
  console.log(`5etools-mcp HTTP placeholder listening on port ${port}`);
});
