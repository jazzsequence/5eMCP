import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBookContent } from "../../src/search/book-content.js";

vi.mock("../../src/manifest/refresh.js", () => ({
  getManifest: vi.fn(),
}));

vi.mock("../../src/cache/index.js", () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/github.js", () => ({
  fetchRaw: vi.fn(),
}));

import { getManifest } from "../../src/manifest/refresh.js";
import { fetchRaw } from "../../src/github.js";

const mockGetManifest = vi.mocked(getManifest);
const mockFetchRaw = vi.mocked(fetchRaw);

// Minimal SCC book content structure
const FAKE_SCC_BOOK_DATA = {
  data: [
    {
      type: "section",
      name: "Welcome to Strixhaven",
      entries: ["Welcome text."],
    },
    {
      type: "section",
      name: "Life at Strixhaven",
      entries: [
        "Campus overview text.",
        {
          type: "section",
          name: "Lorehold College",
          entries: ["Lorehold is the college of history and order."],
        },
        {
          type: "section",
          name: "Prismari College",
          entries: ["Prismari is the college of art and chaos."],
        },
      ],
    },
    {
      type: "section",
      name: "School Is in Session",
      entries: [
        {
          type: "section",
          name: "Relationships",
          entries: [
            "Relationships are a key part of Strixhaven.",
            {
              type: "entries",
              name: "Making Friends and Rivals",
              entries: ["Choose up to 2 relationships per adventure."],
            },
          ],
        },
        {
          type: "section",
          name: "Exams",
          entries: ["Exams are skill challenges."],
        },
      ],
    },
  ],
};

// Minimal SCC-CK adventure content structure
const FAKE_SCC_CK_DATA = {
  data: [
    {
      type: "section",
      name: "Campus Kerfuffle",
      entries: [
        "Introduction text.",
        {
          type: "section",
          name: "Running This Adventure",
          entries: ["How to run this adventure."],
        },
        {
          type: "section",
          name: "Year One, Autumn",
          entries: ["The first year autumn events."],
        },
      ],
    },
  ],
};

function makeManifest() {
  return {
    ruleset: "2024" as const,
    built_at: Date.now(),
    content: {
      book: [
        { name: "book-scc.json", path: "book/book-scc.json", url: "https://raw.example.com/book-scc.json", sha: "scc1", source: "SCC" },
        { name: "book-egw.json", path: "book/book-egw.json", url: "https://raw.example.com/book-egw.json", sha: "egw1", source: "EGW" },
      ],
      adventure: [
        { name: "adventure-scc-ck.json", path: "adventure/adventure-scc-ck.json", url: "https://raw.example.com/adventure-scc-ck.json", sha: "ck1", source: "SCC-CK" },
        { name: "adventure-cos.json", path: "adventure/adventure-cos.json", url: "https://raw.example.com/adventure-cos.json", sha: "cos1", source: "COS" },
      ],
    },
    homebrew: {},
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockGetManifest.mockResolvedValue(makeManifest() as never);
});

describe("getBookContent", () => {
  // ── TOC mode (no section filter) ──────────────────────────────────────────

  it("returns TOC with top-level section names when no section filter is given", async () => {
    mockFetchRaw.mockResolvedValueOnce(FAKE_SCC_BOOK_DATA);
    const result = await getBookContent("SCC", undefined, undefined, "2024");
    expect(result).not.toBeNull();
    expect(result?.source).toBe("SCC");
    expect(result?.sections).toContain("Welcome to Strixhaven");
    expect(result?.sections).toContain("Life at Strixhaven");
    expect(result?.sections).toContain("School Is in Session");
    expect(result).not.toHaveProperty("text");
  });

  it("returns TOC for adventure content files (e.g. SCC-CK)", async () => {
    mockFetchRaw.mockResolvedValueOnce(FAKE_SCC_CK_DATA);
    const result = await getBookContent("SCC-CK", undefined, undefined, "2024");
    expect(result).not.toBeNull();
    expect(result?.source).toBe("SCC-CK");
    expect(result?.sections).toContain("Campus Kerfuffle");
  });

  it("source lookup is case-insensitive", async () => {
    mockFetchRaw.mockResolvedValueOnce(FAKE_SCC_BOOK_DATA);
    const result = await getBookContent("scc", undefined, undefined, "2024");
    expect(result).not.toBeNull();
    expect(result?.source).toBe("SCC");
  });

  // ── Section filter: leaf section (no named children) → returns text ───────

  it("returns rendered text directly when section is a leaf (no named subsections)", async () => {
    mockFetchRaw.mockResolvedValueOnce(FAKE_SCC_BOOK_DATA);
    const result = await getBookContent("SCC", "Welcome to Strixhaven", undefined, "2024");
    expect(result).not.toBeNull();
    expect(result?.section).toBe("Welcome to Strixhaven");
    expect(result?.text).toBeDefined();
    expect(typeof result?.text).toBe("string");
    expect(result?.text).toContain("Welcome text.");
    expect(result).not.toHaveProperty("subsections");
  });

  it("leaf section result has no sections list", async () => {
    mockFetchRaw.mockResolvedValueOnce(FAKE_SCC_BOOK_DATA);
    const result = await getBookContent("SCC", "Welcome to Strixhaven", undefined, "2024");
    expect(result).not.toHaveProperty("sections");
  });

  // ── Section filter: section with named children → returns subsection TOC ──

  it("returns subsection list when section has named children", async () => {
    mockFetchRaw.mockResolvedValueOnce(FAKE_SCC_BOOK_DATA);
    const result = await getBookContent("SCC", "Life at Strixhaven", undefined, "2024");
    expect(result).not.toBeNull();
    expect(result?.section).toBe("Life at Strixhaven");
    expect(result?.subsections).toBeDefined();
    expect(result?.subsections).toContain("Lorehold College");
    expect(result?.subsections).toContain("Prismari College");
    expect(result).not.toHaveProperty("text");
  });

  it("returns subsection list for deeply nested sections with children", async () => {
    mockFetchRaw.mockResolvedValueOnce(FAKE_SCC_BOOK_DATA);
    const result = await getBookContent("SCC", "Relationships", undefined, "2024");
    expect(result).not.toBeNull();
    expect(result?.section).toBe("Relationships");
    expect(result?.subsections).toBeDefined();
    expect(result?.subsections).toContain("Making Friends and Rivals");
    expect(result).not.toHaveProperty("text");
  });

  it("section filter is case-insensitive substring match", async () => {
    mockFetchRaw.mockResolvedValueOnce(FAKE_SCC_BOOK_DATA);
    const result = await getBookContent("SCC", "lorehold", undefined, "2024");
    expect(result).not.toBeNull();
    expect(result?.section).toBe("Lorehold College");
  });

  it("returns available sections list when section filter matches nothing", async () => {
    mockFetchRaw.mockResolvedValueOnce(FAKE_SCC_BOOK_DATA);
    const result = await getBookContent("SCC", "Nonexistent Section", undefined, "2024");
    expect(result).not.toBeNull();
    expect(result?.error).toMatch(/not found/i);
    expect(result?.sections).toBeDefined();
  });

  // ── Subsection filter: section + subsection → returns text ────────────────

  it("returns text of a specific subsection when both section and subsection are provided", async () => {
    mockFetchRaw.mockResolvedValueOnce(FAKE_SCC_BOOK_DATA);
    const result = await getBookContent("SCC", "Life at Strixhaven", "Lorehold", "2024");
    expect(result).not.toBeNull();
    expect(result?.section).toBe("Life at Strixhaven");
    expect(result?.subsection).toBe("Lorehold College");
    expect(result?.text).toBeDefined();
    expect(result?.text).toContain("Lorehold is the college of history and order.");
  });

  it("subsection filter is case-insensitive substring match", async () => {
    mockFetchRaw.mockResolvedValueOnce(FAKE_SCC_BOOK_DATA);
    const result = await getBookContent("SCC", "Life at Strixhaven", "prismari", "2024");
    expect(result?.subsection).toBe("Prismari College");
    expect(result?.text).toContain("Prismari is the college of art and chaos.");
  });

  it("returns subsection list when subsection filter matches nothing", async () => {
    mockFetchRaw.mockResolvedValueOnce(FAKE_SCC_BOOK_DATA);
    const result = await getBookContent("SCC", "Life at Strixhaven", "Nonexistent", "2024");
    expect(result).not.toBeNull();
    expect(result?.error).toMatch(/not found/i);
    expect(result?.subsections).toBeDefined();
    expect(result?.subsections).toContain("Lorehold College");
    expect(result?.subsections).toContain("Prismari College");
  });

  it("subsection text does not include sibling subsections", async () => {
    mockFetchRaw.mockResolvedValueOnce(FAKE_SCC_BOOK_DATA);
    const result = await getBookContent("SCC", "Life at Strixhaven", "Lorehold", "2024");
    expect(result?.text).not.toContain("Prismari");
  });

  // ── Book vs adventure lookup ──────────────────────────────────────────────

  it("searches book content first, then adventure content", async () => {
    mockFetchRaw.mockResolvedValueOnce(FAKE_SCC_BOOK_DATA);
    await getBookContent("SCC", undefined, undefined, "2024");
    expect(mockFetchRaw).toHaveBeenCalledWith("https://raw.example.com/book-scc.json");
  });

  it("finds source in adventure content when not in book content", async () => {
    mockFetchRaw.mockResolvedValueOnce(FAKE_SCC_CK_DATA);
    const result = await getBookContent("SCC-CK", undefined, undefined, "2024");
    expect(result).not.toBeNull();
    expect(mockFetchRaw).toHaveBeenCalledWith("https://raw.example.com/adventure-scc-ck.json");
  });

  it("returns null when source not found in book or adventure content", async () => {
    const result = await getBookContent("UNKNOWN", undefined, undefined, "2024");
    expect(result).toBeNull();
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  it("resolves {@tags} in rendered text", async () => {
    const dataWithTags = {
      data: [{
        type: "section",
        name: "Tagged Section",
        entries: ["{@b bold text}"],
      }],
    };
    mockFetchRaw.mockResolvedValueOnce(dataWithTags);
    const result = await getBookContent("SCC", "Tagged Section", undefined, "2024");
    expect(result?.text).toContain("**bold text**");
  });

  it("strips internal fields from rendered text", async () => {
    const dataWithInternal = {
      data: [{
        type: "section",
        name: "Internal Section",
        entries: ["text"],
        _internalField: "hidden",
      }],
    };
    mockFetchRaw.mockResolvedValueOnce(dataWithInternal);
    const result = await getBookContent("SCC", "Internal Section", undefined, "2024");
    expect(result?.text).not.toContain("_internalField");
    expect(result?.text).not.toContain("hidden");
  });
});
