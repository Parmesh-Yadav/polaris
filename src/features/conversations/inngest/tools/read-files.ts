import { z } from "zod";
import { createTool } from "@inngest/agent-kit";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

interface ReadFilesToolOptions {
  internalKey: string;
}

const paramsSchema = z.object({
  fileIds: z
    .array(z.string().min(1, "File ID cannot be empty"))
    .min(1, "At least one file ID must be provided"),
});

export const createReadFilesTool = ({ internalKey }: ReadFilesToolOptions) => {
  return createTool({
    name: "readFiles",
    description:
      "Read the content of files from the project. Returns the file content.",
    parameters: z.object({
      fileIds: z.array(z.string()).describe("An array of file IDs to read"),
    }),
    handler: async (params, { step: toolStep }) => {
      const parsed = paramsSchema.safeParse(params);
      if (!parsed.success) {
        return `Error: ${parsed.error.issues[0].message}`;
      }

      const { fileIds } = parsed.data;

      try {
        return await toolStep?.run("read-files", async () => {
          const results: { id: string; name: string; content: string }[] = [];

          for (const fileId of fileIds) {
            const file = await convex.query(api.system.getFileById, {
              internalKey,
              fileId: fileId as Id<"files">,
            });
            if (file && file.content) {
              results.push({
                id: fileId,
                name: file.name,
                content: file.content,
              });
            }
          }
          if (results.length === 0) {
            return `Error: No files found with provided IDs. Use listFiles tool to get the list of available files and their IDs.`;
          }

          return JSON.stringify(results);
        });
      } catch (e) {
        return `Error reading files: ${e instanceof Error ? e.message : "Unknown error"}`;
      }
    },
  });
};
