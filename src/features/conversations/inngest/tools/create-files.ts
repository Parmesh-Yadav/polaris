import { z } from "zod";
import { createTool } from "@inngest/agent-kit";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

interface CreateFilesToolOptions {
  projectId: Id<"projects">;
  internalKey: string;
}

const paramsSchema = z.object({
  parentId: z.string(),
  files: z
    .array(
      z.object({
        name: z.string().min(1, "File name cannot be empty"),
        content: z.string(),
      }),
    )
    .min(1, "Provide at least one file to create."),
});

export const createCreateFilesTool = ({
  projectId,
  internalKey,
}: CreateFilesToolOptions) => {
  return createTool({
    name: "createFiles",
    description:
      "Create multiple files in the same folder. Use this to batch create files that share the same parent folder. More efficient than creating files one by one.",
    parameters: z.object({
      parentId: z
        .string()
        .describe(
          "The ID of the parent folder where the files will be created. Use empty string for the root folder. Must be a valid folder ID. Use listFiles tool to get the list of available files and their IDs.",
        ),
      files: z
        .array(
          z.object({
            name: z
              .string()
              .describe(
                "The name of the file including extension. Must be unique within the same folder.",
              ),
            content: z.string().describe("The content of the file."),
          }),
        )
        .describe(
          "Array of files to create. Each file must have a name and content. The name must be unique within the same folder.",
        ),
    }),
    handler: async (params, { step: toolStep }) => {
      const parsed = paramsSchema.safeParse(params);
      if (!parsed.success) {
        return `Error: ${parsed.error.issues[0].message}`;
      }

      const { parentId, files } = parsed.data;

      try {
        return await toolStep?.run("create-files", async () => {
          let resolvedParentId: Id<"files"> | undefined;
          if (parentId && parentId !== "") {
            try {
              resolvedParentId = parentId as Id<"files">;

              const parentFolder = await convex.query(api.system.getFileById, {
                internalKey,
                fileId: resolvedParentId,
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

          const results = await convex.mutation(api.system.createFiles, {
            internalKey,
            projectId,
            parentId: resolvedParentId,
            files,
          });

          const created = results.filter((r) => !r.error);
          const failed = results.filter((r) => r.error);

          // response for the model
          let response = `Created ${created.length} file(s)`;
          if (created.length > 0) {
            response += `: ${created.map((r) => r.name).join(", ")}.`;
          }
          if (failed.length > 0) {
            response += ` Failed to create ${failed.length} file(s): ${failed
              .map((r) => `${r.name} (${r.error})`)
              .join(", ")}.`;
          }
          return response;
        });
      } catch (e) {
        return `Error creating files: ${e instanceof Error ? e.message : "Unknown error"}`;
      }
    },
  });
};
