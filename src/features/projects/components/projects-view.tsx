"use client";

import { Poppins } from "next/font/google";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SparkleIcon } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { FaGithub } from "react-icons/fa";
import { ProjectsList } from "./projects-list";
import { useCreateProject } from "../hooks/use-projects";
import { adjectives, animals, colors, uniqueNamesGenerator } from "unique-names-generator"
import { useEffect, useState } from "react";
import { ProjectsCommandDialogue } from "./projects-command-dialogue";
import { ImportGithubDialogue } from "./import-github-dailogue";
import { NewProjectDialog } from "./new-project-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const font = Poppins({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
})

export const ProjectsView = () => {
    const createProject = useCreateProject();

    const [commandDialogueOpen, setCommandDialogueOpen] = useState(false);
    const [importGithubDialogueOpen, setImportGithubDialogueOpen] = useState(false);
    const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey) {
                if (e.key === 'k') {
                    e.preventDefault();
                    setCommandDialogueOpen(true);
                }
                if (e.key === 'i') {
                    e.preventDefault();
                    setImportGithubDialogueOpen(true);
                }
                if (e.key === 'j') {
                    e.preventDefault();
                    setNewProjectDialogOpen(true);
                }
            }
        }

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        }
    }, []);

    return (
        <>
            <ProjectsCommandDialogue
                open={commandDialogueOpen}
                onOpenChange={setCommandDialogueOpen}
            />
            <ImportGithubDialogue
                open={importGithubDialogueOpen}
                onOpenChange={setImportGithubDialogueOpen}
            />
            <NewProjectDialog
                open={newProjectDialogOpen}
                onOpenChange={setNewProjectDialogOpen}
            />
            <div className="min-h-screen bg-sidebar flex flex-col items-center justify-center p-6 md:p-16">
                <div className="w-full max-w-sm mx-auto flex flex-col gap-4 items-center">
                    <div className="flex justify-between gap-4 w-full items-center">
                        <div className="flex items-center gap-2 w-full group/logo">
                            <img
                                src="/logo.svg"
                                alt="polaris"
                                className="size-8 md:size-11.5"
                            />
                            <h1 className={cn(
                                "text-4xl md:text-5xl font-semibold",
                                font.className
                            )}>
                                Polaris
                            </h1>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 w-full">
                        <div className="grid grid-cols-2 gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="h-full items-start justify-start p-4 bg-background border flex flex-col gap-6 rounded-none"
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <SparkleIcon className="size-4" />
                                            <Kbd className="bg-accent border">
                                                cmd + j
                                            </Kbd>
                                        </div>
                                        <div>
                                            <span className="text-sm">
                                                New
                                            </span>
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="start" className="w-48">
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setNewProjectDialogOpen(true);
                                        }}
                                    >
                                        ✨ Create with AI
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                        onClick={() => {
                                            createProject({
                                                name: uniqueNamesGenerator({
                                                    dictionaries: [adjectives, colors, animals],
                                                    separator: "-",
                                                    length: 3,
                                                })
                                            });
                                        }}
                                    >
                                        📁 Blank Project
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                                variant="outline"
                                onClick={() => setImportGithubDialogueOpen(true)}
                                className="h-full items-start justify-start p-4 bg-background border flex flex-col gap-6 rounded-none"
                            >
                                <div className="flex items-center justify-between w-full">
                                    <FaGithub className="size-4" />
                                    <Kbd className="bg-accent border">
                                        cmd + i
                                    </Kbd>
                                </div>
                                <div>
                                    <span className="text-sm">
                                        Import
                                    </span>
                                </div>
                            </Button>
                        </div>
                        <ProjectsList onViewAll={() => setCommandDialogueOpen(true)} />
                    </div>
                </div>
            </div>
        </>
    );
};