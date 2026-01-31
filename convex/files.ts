import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyAuth } from "./auth";
import { Id } from "./_generated/dataModel";

export const getFiles = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get("projects", args.projectId);
    if (!project) throw new Error("Project not found");

    if (project.ownerId !== identity.subject)
      throw new Error("Unauthorized access to project files");

    return await ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});

export const getFile = query({
  args: {
    id: v.id("files"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const file = await ctx.db.get("files", args.id);
    if (!file) throw new Error("File not found");

    const project = await ctx.db.get("projects", file.projectId);
    if (!project) throw new Error("Project not found");

    if (project.ownerId !== identity.subject)
      throw new Error("Unauthorized access to project files");

    return file;
  },
});

export const getFolderContents = query({
  args: {
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get("projects", args.projectId);
    if (!project) throw new Error("Project not found");

    if (project.ownerId !== identity.subject)
      throw new Error("Unauthorized access to project files");

    const files = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", args.projectId).eq("parentId", args.parentId),
      )
      .order("asc")
      .collect();

    // sort: folder first, then files, alphabetically within each group
    return files.sort((a, b) => {
      // Folders before files
      if (a.type === "folder" && b.type === "file") return -1;
      // Files after folders
      if (a.type === "file" && b.type === "folder") return 1;
      // Both same type, sort alphabetically
      return a.name.localeCompare(b.name);
    });
  },
});

export const createFile = mutation({
  args: {
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get("projects", args.projectId);
    if (!project) throw new Error("Project not found");

    if (project.ownerId !== identity.subject)
      throw new Error("Unauthorized access to project files");

    const files = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", args.projectId).eq("parentId", args.parentId),
      )
      .order("asc")
      .collect();

    const existing = files.find(
      (f) => f.name === args.name && f.type === "file",
    );
    if (existing)
      throw new Error("File with the same name already exists in this folder");

    await ctx.db.insert("files", {
      projectId: args.projectId,
      parentId: args.parentId,
      name: args.name,
      type: "file",
      content: args.content,
      updatedAt: Date.now(),
    });

    await ctx.db.patch("projects", project._id, {
      updatedAt: Date.now(),
    });
  },
});

export const createFolder = mutation({
  args: {
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get("projects", args.projectId);
    if (!project) throw new Error("Project not found");

    if (project.ownerId !== identity.subject)
      throw new Error("Unauthorized access to project files");

    const files = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", args.projectId).eq("parentId", args.parentId),
      )
      .order("asc")
      .collect();

    const existing = files.find(
      (f) => f.name === args.name && f.type === "folder",
    );
    if (existing)
      throw new Error(
        "Folder with the same name already exists in this folder",
      );

    await ctx.db.insert("files", {
      projectId: args.projectId,
      parentId: args.parentId,
      name: args.name,
      type: "folder",
      updatedAt: Date.now(),
    });

    await ctx.db.patch("projects", project._id, {
      updatedAt: Date.now(),
    });
  },
});

export const renameFile = mutation({
  args: {
    id: v.id("files"),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const file = await ctx.db.get("files", args.id);
    if (!file) throw new Error("File not found");

    const project = await ctx.db.get("projects", file.projectId);
    if (!project) throw new Error("Project not found");
    if (project.ownerId !== identity.subject)
      throw new Error("Unauthorized access to project files");

    const siblings = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", file.projectId).eq("parentId", file.parentId),
      )
      .collect();

    const existing = siblings.find(
      (f) =>
        f.name === args.newName && f.type === file.type && f._id !== file._id,
    );
    if (existing)
      throw new Error(
        `A ${file.type} with the same name already exists in this folder`,
      );

    await ctx.db.patch("files", args.id, {
      name: args.newName,
      updatedAt: Date.now(),
    });

    await ctx.db.patch("projects", project._id, {
      updatedAt: Date.now(),
    });
  },
});

export const deleteFile = mutation({
  args: {
    id: v.id("files"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const file = await ctx.db.get("files", args.id);
    if (!file) throw new Error("File not found");

    const project = await ctx.db.get("projects", file.projectId);
    if (!project) throw new Error("Project not found");
    if (project.ownerId !== identity.subject)
      throw new Error("Unauthorized access to project files");

    // recursively delete till all descendants are deleted
    const deleteRecursive = async (fileId: Id<"files">) => {
      const item = await ctx.db.get("files", fileId);
      if (!item) return;

      // If folder, delete children first
      if (item.type === "folder") {
        const children = await ctx.db
          .query("files")
          .withIndex("by_project_parent", (q) =>
            q.eq("projectId", item.projectId).eq("parentId", fileId),
          )
          .collect();

        for (const child of children) await deleteRecursive(child._id);
      }
      // Delete the item itself
      // storage files -> delete from storage if needed
      if (item.storageId) await ctx.storage.delete(item.storageId);
      // delete the file/folder itself
      await ctx.db.delete("files", fileId);
    };

    await deleteRecursive(args.id);

    await ctx.db.patch("projects", project._id, {
      updatedAt: Date.now(),
    });
  },
});

export const updateFile = mutation({
  args: {
    id: v.id("files"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const file = await ctx.db.get("files", args.id);
    if (!file) throw new Error("File not found");

    const project = await ctx.db.get("projects", file.projectId);
    if (!project) throw new Error("Project not found");
    if (project.ownerId !== identity.subject)
      throw new Error("Unauthorized access to project files");

    const now = Date.now();
    await ctx.db.patch("files", args.id, {
      content: args.content,
      updatedAt: now,
    });

    await ctx.db.patch("projects", project._id, {
      updatedAt: now,
    });
  },
});
