"use client";

import { ChevronRightIcon } from "lucide-react";
import { FileIcon, FolderIcon } from "@react-symbols/icons/utils"
import { cn } from "@/lib/utils";
import { useCreateFile, useCreateFolder, useFolderContents, useRenameFile, useDeleteFile } from "../../hooks/use-files";
import { getItemPadding } from "./contants";
import { LoadingRow } from "./loading-row";
import { CreateInput } from "./create-input";
import { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { TreeItemWrapper } from "./tree-item-wrapper";
import { RenameInput } from "./rename-input";
import { useEditor } from "@/features/editor/hooks/use-editor";

export const Tree = ({
    item,
    level = 0,
    projectId
}: {
    item: Doc<"files">;
    level: number;
    projectId: Id<"projects">;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [creating, setCreating] = useState<null | "file" | "folder">(null);

    const renameFile = useRenameFile({
        projectId,
        parentId: item.parentId,
    });

    const deleteFile = useDeleteFile({
        projectId,
        parentId: item.parentId,
    });

    const createFile = useCreateFile();

    const createFolder = useCreateFolder();

    const folderContents = useFolderContents({
        projectId,
        parentId: item._id,
        enabled: item.type === "folder" && isOpen,
    });

    const { openFile, closeTab, activeTabId } = useEditor(projectId);

    const handleCreate = (name: string) => {
        setCreating(null);
        if (creating === "file") {
            createFile({
                projectId,
                name,
                content: "",
                parentId: item._id,
            });
        } else if (creating === "folder") {
            createFolder({
                projectId,
                name,
                parentId: item._id,
            });
        }
    }

    const handleRename = (name: string) => {
        setIsRenaming(false);
        if (name.trim() === item.name) return;
        renameFile({
            id: item._id,
            newName: name,
        });
    }

    const startCreating = (type: "file" | "folder") => {
        setIsOpen(true);
        setCreating(type);
    }

    if (item.type === "file") {
        const filename = item.name;
        const isActive = activeTabId === item._id;

        if (isRenaming) {
            return (
                <RenameInput
                    type={"file"}
                    defaultValue={filename}
                    level={level}
                    onSubmit={handleRename}
                    onCancel={() => setIsRenaming(false)}
                />
            );
        }

        return (
            <TreeItemWrapper
                item={item}
                level={level}
                isActive={isActive}
                onClick={() => openFile(item._id, { pinned: false })}
                onDoubleClick={() => openFile(item._id, { pinned: true })}
                onRename={() => setIsRenaming(true)}
                onDelete={() => {
                    closeTab(item._id);
                    deleteFile({
                        id: item._id,
                    });
                }}
            >
                <FileIcon
                    fileName={filename}
                    autoAssign
                    className="size-4"
                />
                <span className="truncate text-sm">
                    {filename}
                </span>
            </TreeItemWrapper>
        );
    }

    const foldername = item.name;
    const folderRender = (
        <>
            <div className="flex items-center gap-0.5">
                <ChevronRightIcon
                    className={cn(
                        "size-4 shrink-0 text-muted-foreground",
                        isOpen && "rotate-90",
                    )}
                />
                <FolderIcon
                    folderName={foldername}
                    className="size-4"
                />
            </div>
            <span className="truncate text-sm">
                {foldername}
            </span>
        </>
    )

    if (creating) {
        return (
            <>
                <button
                    onClick={() => setIsOpen((value) => !value)}
                    className="group flex items-center gap-1 h-5.5 hover:bg-accent/30 w-full"
                    style={{
                        paddingLeft: getItemPadding(level, false),
                    }}
                >
                    {folderRender}
                </button>
                {
                    isOpen && (
                        <>
                            {
                                folderContents === undefined && <LoadingRow level={level + 1} />
                            }
                            <CreateInput
                                type={creating}
                                level={level + 1}
                                onSubmit={handleCreate}
                                onCancel={() => setCreating(null)}
                            />
                            {
                                folderContents?.map((item) => (
                                    <Tree
                                        key={item._id}
                                        item={item}
                                        level={level + 1}
                                        projectId={projectId}
                                    />
                                ))
                            }
                        </>
                    )
                }
            </>
        );
    }

    if (isRenaming) {
        return (
            <>
                <RenameInput
                    type={"folder"}
                    defaultValue={foldername}
                    isOpen={isOpen}
                    level={level}
                    onSubmit={handleRename}
                    onCancel={() => setIsRenaming(false)}
                />
                {
                    isOpen && (
                        <>
                            {
                                folderContents === undefined && <LoadingRow level={level + 1} />
                            }
                            {
                                folderContents?.map((item) => (
                                    <Tree
                                        key={item._id}
                                        item={item}
                                        level={level + 1}
                                        projectId={projectId}
                                    />
                                ))
                            }
                        </>
                    )
                }
            </>
        );
    }

    return (
        <>
            <TreeItemWrapper
                item={item}
                level={level}
                isActive={false}
                onClick={() => setIsOpen((prev) => !prev)}
                onRename={() => setIsRenaming(true)}
                onDelete={() => {
                    deleteFile({
                        id: item._id,
                    });
                }}
                onCreateFile={() => startCreating("file")}
                onCreateFolder={() => startCreating("folder")}
            >
                {folderRender}
            </TreeItemWrapper>
            {
                isOpen && (
                    <>
                        {
                            folderContents === undefined && <LoadingRow level={level + 1} />
                        }
                        {
                            folderContents?.map((item) => (
                                <Tree
                                    key={item._id}
                                    item={item}
                                    level={level + 1}
                                    projectId={projectId}
                                />
                            ))
                        }
                    </>
                )
            }
        </>
    );
}