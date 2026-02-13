import { z } from "zod";
import { createTool } from "@inngest/agent-kit";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

interface RenameFileToolOptions {
  internalKey: string;
}

const paramsSchema = z.object({
  fileId: z.string().min(1, " File Id is required"),
  newName: z.string().min(1, "New name is required"),
});

export const createRenameFileTool = ({
  internalKey,
}: RenameFileToolOptions) => {
  return createTool({
    name: "renameFile",
    description: "Rename a file in the project.",
    parameters: z.object({
      fileId: z.string().describe("The ID of the file to update."),
      newName: z.string().describe("The new name for the file."),
    }),
    handler: async (params, { step: toolStep }) => {
      const parsed = paramsSchema.safeParse(params);
      if (!parsed.success) {
        return `Error: ${parsed.error.issues[0].message}`;
      }

      const { fileId, newName } = parsed.data;

      //valide the file exists
      const file = await convex.query(api.system.getFileById, {
        internalKey,
        fileId: fileId as Id<"files">,
      });
      if (!file) {
        return `Error: No file found with ID ${fileId}. Use listFiles tool to get the list of available files and their IDs.`;
      }

      try {
        return await toolStep?.run("rename-file", async () => {
          await convex.mutation(api.system.renameFile, {
            internalKey,
            fileId: fileId as Id<"files">,
            newName,
          });
          return `File with ID ${fileId} has been successfully renamed to ${newName}.`;
        });
      } catch (e) {
        return `Error renaming file: ${e instanceof Error ? e.message : "Unknown error"}`;
      }
    },
  });
};
