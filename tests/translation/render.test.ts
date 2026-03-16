import { describe, it, expect } from "vitest";
import { renderEntriesToMarkdown } from "../../src/translation/render.js";

describe("renderEntriesToMarkdown", () => {
  // ── Plain strings ──────────────────────────────────────────────────────────

  it("renders a plain string as a paragraph", () => {
    const result = renderEntriesToMarkdown(["Hello world."]);
    expect(result).toBe("Hello world.");
  });

  it("joins multiple strings with double newlines", () => {
    const result = renderEntriesToMarkdown(["First paragraph.", "Second paragraph."]);
    expect(result).toBe("First paragraph.\n\nSecond paragraph.");
  });

  it("skips empty strings", () => {
    const result = renderEntriesToMarkdown(["First.", "", "Second."]);
    expect(result).toBe("First.\n\nSecond.");
  });

  // ── Named entries ──────────────────────────────────────────────────────────

  it("renders type:entries with name as a heading", () => {
    const result = renderEntriesToMarkdown([
      { type: "entries", name: "My Section", entries: ["Some text."] },
    ]);
    expect(result).toContain("### My Section");
    expect(result).toContain("Some text.");
  });

  it("renders type:section as a larger heading than type:entries", () => {
    const result = renderEntriesToMarkdown([
      { type: "section", name: "Big Section", entries: ["Body text."] },
    ]);
    expect(result).toContain("## Big Section");
    expect(result).toContain("Body text.");
  });

  it("renders type:entries without a name as body only", () => {
    const result = renderEntriesToMarkdown([
      { type: "entries", entries: ["No heading here."] },
    ]);
    expect(result).not.toContain("#");
    expect(result).toContain("No heading here.");
  });

  // ── Nesting ────────────────────────────────────────────────────────────────

  it("renders nested entries recursively", () => {
    const result = renderEntriesToMarkdown([
      {
        type: "entries",
        name: "Outer",
        entries: [
          "Outer text.",
          { type: "entries", name: "Inner", entries: ["Inner text."] },
        ],
      },
    ]);
    expect(result).toContain("### Outer");
    expect(result).toContain("Outer text.");
    expect(result).toContain("### Inner");
    expect(result).toContain("Inner text.");
  });

  // ── Tables ─────────────────────────────────────────────────────────────────

  it("renders type:table as a markdown table", () => {
    const result = renderEntriesToMarkdown([
      {
        type: "table",
        colLabels: ["Name", "Value"],
        rows: [["Foo", "1"], ["Bar", "2"]],
      },
    ]);
    expect(result).toContain("| Name | Value |");
    expect(result).toContain("| --- | --- |");
    expect(result).toContain("| Foo | 1 |");
    expect(result).toContain("| Bar | 2 |");
  });

  it("renders table caption above the table when present", () => {
    const result = renderEntriesToMarkdown([
      {
        type: "table",
        caption: "My Table",
        colLabels: ["A", "B"],
        rows: [["x", "y"]],
      },
    ]);
    expect(result).toContain("**My Table**");
    expect(result).toContain("| A | B |");
  });

  it("handles table rows with non-string cell values", () => {
    const result = renderEntriesToMarkdown([
      {
        type: "table",
        colLabels: ["Person", "Points"],
        rows: [["Friend", 2], ["Rival", -2]],
      },
    ]);
    expect(result).toContain("| Friend | 2 |");
    expect(result).toContain("| Rival | -2 |");
  });

  // ── Lists ──────────────────────────────────────────────────────────────────

  it("renders type:list as a bullet list", () => {
    const result = renderEntriesToMarkdown([
      { type: "list", items: ["Item one", "Item two", "Item three"] },
    ]);
    expect(result).toContain("- Item one");
    expect(result).toContain("- Item two");
    expect(result).toContain("- Item three");
  });

  // ── Insets ─────────────────────────────────────────────────────────────────

  it("renders type:inset as a blockquote with heading", () => {
    const result = renderEntriesToMarkdown([
      { type: "inset", name: "Sidebar", entries: ["Sidebar content."] },
    ]);
    expect(result).toContain("> **Sidebar**");
    expect(result).toContain("> Sidebar content.");
  });

  it("renders type:insetReadaloud as a plain blockquote", () => {
    const result = renderEntriesToMarkdown([
      { type: "insetReadaloud", entries: ["Read this aloud."] },
    ]);
    expect(result).toContain("> Read this aloud.");
    expect(result).not.toContain("> **");
  });

  // ── Images ─────────────────────────────────────────────────────────────────

  it("skips type:image entirely", () => {
    const result = renderEntriesToMarkdown([
      "Before.",
      { type: "image", href: { type: "internal", path: "foo.webp" }, title: "A picture" },
      "After.",
    ]);
    expect(result).not.toContain("image");
    expect(result).not.toContain("foo.webp");
    expect(result).toBe("Before.\n\nAfter.");
  });

  // ── Gallery ────────────────────────────────────────────────────────────────

  it("skips type:gallery entirely", () => {
    const result = renderEntriesToMarkdown([
      "Text.",
      { type: "gallery", images: [] },
    ]);
    expect(result).toBe("Text.");
  });

  // ── Item lists ─────────────────────────────────────────────────────────────

  it("renders type:item (definition list style) as bold name + text", () => {
    const result = renderEntriesToMarkdown([
      { type: "item", name: "Speed", entry: "Your walking speed is 30 feet." },
    ]);
    expect(result).toContain("**Speed.**");
    expect(result).toContain("Your walking speed is 30 feet.");
  });

  // ── Unknown types ──────────────────────────────────────────────────────────

  it("skips unknown entry types without throwing", () => {
    expect(() =>
      renderEntriesToMarkdown([{ type: "unknownFutureType", data: "whatever" }]),
    ).not.toThrow();
  });

  // ── Non-array input ────────────────────────────────────────────────────────

  it("accepts a single entry object (not array) and renders it", () => {
    const result = renderEntriesToMarkdown(
      { type: "entries", name: "Solo", entries: ["Solo text."] } as never,
    );
    expect(result).toContain("### Solo");
    expect(result).toContain("Solo text.");
  });
});
