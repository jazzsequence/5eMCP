type Entry = string | Record<string, unknown>;

/** Renders a single table cell value to a string. */
function renderCell(cell: unknown): string {
  if (typeof cell === "string") return cell;
  if (typeof cell === "number") return String(cell);
  if (typeof cell === "object" && cell !== null) {
    // Cells can be entry objects — render their text content
    const obj = cell as Record<string, unknown>;
    if (typeof obj.roll === "object") {
      const roll = obj.roll as Record<string, unknown>;
      return `${roll.min ?? ""}–${roll.max ?? ""}`;
    }
    if (typeof obj.entry === "string") return obj.entry;
    if (Array.isArray(obj.entries)) return renderEntriesToMarkdown(obj.entries as Entry[]);
  }
  return String(cell ?? "");
}

/** Renders a 5etools entry node (or array of nodes) to a markdown string. */
export function renderEntriesToMarkdown(entries: Entry | Entry[], depth = 0): string {
  // Accept a single entry object as if it were a one-element array
  const nodes: Entry[] = Array.isArray(entries) ? entries : [entries];

  const parts: string[] = [];

  for (const node of nodes) {
    if (typeof node === "string") {
      if (node.trim()) parts.push(node);
      continue;
    }

    if (typeof node !== "object" || node === null) continue;

    const type = node.type as string | undefined;

    switch (type) {
      case "section": {
        const heading = node.name ? `## ${node.name}` : null;
        const body = renderEntriesToMarkdown((node.entries ?? []) as Entry[], depth);
        if (heading) {
          parts.push(heading + (body ? "\n\n" + body : ""));
        } else if (body) {
          parts.push(body);
        }
        break;
      }

      case "entries": {
        const heading = node.name ? `### ${node.name}` : null;
        const body = renderEntriesToMarkdown((node.entries ?? []) as Entry[], depth + 1);
        if (heading) {
          parts.push(heading + (body ? "\n\n" + body : ""));
        } else if (body) {
          parts.push(body);
        }
        break;
      }

      case "list": {
        const items = (node.items ?? []) as Entry[];
        const lines = items.map((item) => {
          if (typeof item === "string") return `- ${item}`;
          if (typeof item === "object" && item !== null) {
            const obj = item as Record<string, unknown>;
            // type:item is a definition-list style entry
            if (obj.type === "item") {
              const name = obj.name ? `**${obj.name}.** ` : "";
              const text = typeof obj.entry === "string"
                ? obj.entry
                : renderEntriesToMarkdown((obj.entries ?? []) as Entry[]);
              return `- ${name}${text}`;
            }
            return `- ${renderEntriesToMarkdown(obj)}`;
          }
          return `- ${String(item)}`;
        });
        if (lines.length) parts.push(lines.join("\n"));
        break;
      }

      case "item": {
        // Definition list item: **Name.** Text
        const name = node.name ? `**${String(node.name)}.** ` : "";
        const text = typeof node.entry === "string"
          ? node.entry
          : renderEntriesToMarkdown((node.entries ?? []) as Entry[]);
        parts.push(`${name}${text}`);
        break;
      }

      case "table": {
        const lines: string[] = [];
        if (node.caption) lines.push(`**${node.caption}**\n`);
        const cols = (node.colLabels ?? []) as string[];
        if (cols.length) {
          lines.push(`| ${cols.join(" | ")} |`);
          lines.push(`| ${cols.map(() => "---").join(" | ")} |`);
        }
        const rows = (node.rows ?? []) as unknown[][];
        for (const row of rows) {
          const cells = Array.isArray(row) ? row : [row];
          lines.push(`| ${cells.map(renderCell).join(" | ")} |`);
        }
        if (lines.length) parts.push(lines.join("\n"));
        break;
      }

      case "inset": {
        const heading = node.name ? `> **${node.name}**\n>` : null;
        const body = renderEntriesToMarkdown((node.entries ?? []) as Entry[])
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n");
        parts.push(heading ? `${heading}\n${body}` : body);
        break;
      }

      case "insetReadaloud": {
        const body = renderEntriesToMarkdown((node.entries ?? []) as Entry[])
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n");
        parts.push(body);
        break;
      }

      case "quote": {
        const body = renderEntriesToMarkdown((node.entries ?? []) as Entry[])
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n");
        const by = node.by ? `\n>\n> — ${node.by}` : "";
        parts.push(body + by);
        break;
      }

      case "image":
      case "gallery":
        // Skip visual-only content — not useful for LLM text consumption
        break;

      default:
        // Unknown types: try to render entries if present, otherwise skip
        if (Array.isArray(node.entries)) {
          const body = renderEntriesToMarkdown(node.entries as Entry[], depth);
          if (body) parts.push(body);
        }
        break;
    }
  }

  return parts.join("\n\n");
}
