import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getManifest } from "../manifest/refresh.js";
import { fetchRaw } from "../github.js";
import { cacheGet, cacheSet } from "../cache/index.js";
import { contentKey } from "../cache/keys.js";
import { translate } from "../translation/index.js";

const RulesetSchema = z.enum(["2024", "2014"]).default("2024");

export function registerPassthroughTools(server: McpServer): void {
  server.tool(
    "fetch_content",
    [
      "Fetch and translate any file in the manifest by content type and file name.",
      "Returns tag-resolved, metadata-stripped JSON.",
      "Use this for any content type, especially those without typed handlers.",
      "Omit file_name to list available files for the content type.",
    ].join(" "),
    {
      content_type: z
        .string()
        .describe("Content type (e.g. 'spells', 'bestiary', 'conditionsdiseases', 'vehicles')"),
      file_name: z
        .string()
        .optional()
        .describe(
          "File to fetch (e.g. 'spells-phb.json'). Omit to list available files for this type.",
        ),
      ruleset: RulesetSchema.describe("Which ruleset to query"),
      homebrew: z.boolean().default(false).describe("Search homebrew content instead of core"),
    },
    async ({ content_type, file_name, ruleset, homebrew }) => {
      const manifest = await getManifest(ruleset as "2024" | "2014");
      const contentMap = homebrew ? manifest.homebrew : manifest.content;
      const files = contentMap[content_type];

      if (!files || files.length === 0) {
        const available = Object.keys(contentMap).sort().join(", ");
        return {
          content: [
            {
              type: "text",
              text: `Content type '${content_type}' not found.\n\nAvailable types: ${available}`,
            },
          ],
          isError: true,
        };
      }

      // List mode — no file_name provided
      if (!file_name) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  content_type,
                  ruleset,
                  file_count: files.length,
                  files: files.map((f) => ({
                    name: f.name,
                    source: f.source,
                    has_fluff: !!f.fluff_url,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Find the requested file
      const needle = file_name.endsWith(".json") ? file_name : `${file_name}.json`;
      const manifestFile = files.find((f) => f.name === needle || f.name === file_name);

      if (!manifestFile) {
        const available = files.map((f) => f.name).join(", ");
        return {
          content: [
            {
              type: "text",
              text: `File '${file_name}' not found in '${content_type}'.\n\nAvailable: ${available}`,
            },
          ],
          isError: true,
        };
      }

      // Check SHA-keyed cache
      const cacheKeyVal = contentKey(manifestFile.sha);
      const cached = await cacheGet<unknown>(cacheKeyVal);
      if (cached) {
        return {
          content: [{ type: "text", text: JSON.stringify(cached, null, 2) }],
        };
      }

      // Fetch mechanical file
      const raw = await fetchRaw(manifestFile.url);

      // Fetch fluff if available (with its own SHA-keyed cache)
      let fluff: unknown;
      if (manifestFile.fluff_url) {
        if (manifestFile.fluff_sha) {
          fluff = await cacheGet<unknown>(contentKey(manifestFile.fluff_sha));
        }
        if (!fluff) {
          fluff = await fetchRaw(manifestFile.fluff_url);
          if (manifestFile.fluff_sha) {
            await cacheSet(contentKey(manifestFile.fluff_sha), fluff);
          }
        }
      }

      // Translate (typed handler or passthrough)
      const translated = translate(content_type, raw, fluff);

      // Cache translated result by SHA
      await cacheSet(cacheKeyVal, translated);

      return {
        content: [{ type: "text", text: JSON.stringify(translated, null, 2) }],
      };
    },
  );
}
