import { z } from "zod";
import { createTool } from "@inngest/agent-kit";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

interface UpdateFilesToolOptions {
  internalKey: string;
}

const paramsSchema = z.object({
  fileId: z.string().min(1, " File Id is required"),
  content: z.string(),
});

export const createUpdateFilesTool = ({
  internalKey,
}: UpdateFilesToolOptions) => {
  return createTool({
    name: "updateFiles",
    description: "Update the content of a file in the project.",
    parameters: z.object({
      fileId: z.string().describe("The ID of the file to update."),
      content: z.string().describe("The new content for the file."),
    }),
    handler: async (params, { step: toolStep }) => {
      const parsed = paramsSchema.safeParse(params);
      if (!parsed.success) {
        return `Error: ${parsed.error.issues[0].message}`;
      }

      const { fileId, content } = parsed.data;

      //valide the file exists
      const file = await convex.query(api.system.getFileById, {
        internalKey,
        fileId: fileId as Id<"files">,
      });
      if (!file) {
        return `Error: No file found with ID ${fileId}. Use listFiles tool to get the list of available files and their IDs.`;
      }
      if (file.type === "folder") {
        return `Error: The provided ID ${fileId} belongs to a folder, not a file. Please provide a valid file ID. Use listFiles tool to get the list of available files and their IDs.`;
      }

      try {
        return await toolStep?.run("update-file", async () => {
          await convex.mutation(api.system.updateFile, {
            internalKey,
            fileId: fileId as Id<"files">,
            content,
          });
          return `File with ID ${fileId} has been successfully updated.`;
        });
      } catch (e) {
        return `Error updating file: ${e instanceof Error ? e.message : "Unknown error"}`;
      }
    },
  });
};
