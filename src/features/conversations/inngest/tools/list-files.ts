import { z } from "zod";
import { createTool } from "@inngest/agent-kit";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

interface ListFilesToolOptions {
  projectId: Id<"projects">;
  internalKey: string;
}

export const createListFilesTool = ({
  internalKey,
  projectId,
}: ListFilesToolOptions) => {
  return createTool({
    name: "listFiles",
    description:
      "List all the file and folders in the project. Return names, IDs, types, and parentId for each of them. Items with parentId as null are in the root directory. Use the parentId to understand the folder structure. Items with the same parentId are in the same folder.",
    parameters: z.object({}),
    handler: async (_, { step: toolStep }) => {
      try {
        return await toolStep?.run("list-files", async () => {
          const files = await convex.query(api.system.getProjectFiles, {
            internalKey,
            projectId,
          });

          // sort: folder first, then files, alphabetically
          const sorted = files.sort((a, b) => {
            if (a.type === b.type) {
              return a.name.localeCompare(b.name);
            }
            return a.type === "folder" ? -1 : 1;
          });

          const fileList = sorted.map((file) => ({
            id: file._id,
            name: file.name,
            type: file.type,
            parentId: file.parentId ?? null,
          }));

          return JSON.stringify(fileList);
        });
      } catch (e) {
        return `Error listing files: ${e instanceof Error ? e.message : "Unknown error"}`;
      }
    },
  });
};
