import { z } from "zod";
import { createTool } from "@inngest/agent-kit";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

interface CreateFolderToolOptions {
  projectId: Id<"projects">;
  internalKey: string;
}

const paramsSchema = z.object({
  name: z.string().min(1, "Folder name is required."),
  parentId: z.string(),
});

export const createCreateFolderTool = ({
  projectId,
  internalKey,
}: CreateFolderToolOptions) => {
  return createTool({
    name: "createFolder",
    description: "Create a new folder in the project.",
    parameters: z.object({
      name: z.string().describe("The name of the folder to create."),
      parentId: z
        .string()
        .describe(
          "The ID (not name!) of the parent folder from listFiles. Use empty string for root level.",
        ),
    }),
    handler: async (params, { step: toolStep }) => {
      const parsed = paramsSchema.safeParse(params);
      if (!parsed.success) {
        return `Error: ${parsed.error.issues[0].message}`;
      }

      const { parentId, name } = parsed.data;

      try {
        return await toolStep?.run("create-folder", async () => {
          if (parentId) {
            try {
              const parentFolder = await convex.query(api.system.getFileById, {
                internalKey,
                fileId: parentId as Id<"files">,
              });
              if (!parentFolder) {
                return `Error: Parent folder with ID ${parentId} does not exist.`;
              }
              if (parentFolder.type !== "folder") {
                return `Error: The provided parentId ${parentId} is not a folder.`;
              }
            } catch (e) {
              return `Error: Invalid parentId ${parentId}. It must be a valid file ID. Use listFiles tool to get the list of valid folderIDs, or use empty string for root level.`;
            }
          }

          const folderId = await convex.mutation(api.system.createFolder, {
            internalKey,
            projectId,
            parentId: parentId ? (parentId as Id<"files">) : undefined,
            name,
          });

          return `Folder created successfully with ID: ${folderId}`;
        });
      } catch (e) {
        return `Error creating folder: ${e instanceof Error ? e.message : "Unknown error"}`;
      }
    },
  });
};
