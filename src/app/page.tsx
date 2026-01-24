"use client";

import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const Page = () => {
  const projects = useQuery(api.projects.get);

  const createProject = useMutation(api.projects.create);

  return (
    <div className="flex flex-col gap-2 p-4">
      <Button
        onClick={() => createProject({ name: "New Project" })}
      >
        Add new
      </Button>
      {
        projects?.map((project) => (
          <div key={project._id} className="border rounded flex flex-col p-2">
            <p>
              {project.name}
            </p>
            <p>
              {project.ownerId}
            </p>
          </div>
        ))
      }
    </div>
  );
}

export default Page;