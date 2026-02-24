import { ProjectIdLayout } from "@/features/projects/components/project-id-layout";
import { ReactNode } from "react";
import { Id } from "../../../../convex/_generated/dataModel";

const layout = async ({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ projectId: string }>;
}) => {
    const { projectId } = await params;

    return (
        <ProjectIdLayout projectId={projectId as Id<"projects">}>
            {children}
        </ProjectIdLayout>
    );
};

export default layout;