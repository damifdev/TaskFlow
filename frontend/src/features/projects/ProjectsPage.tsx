import { useState } from "react";
import type { ProjectDto } from "@/api/types";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/Skeleton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDeleteProject, useProjects } from "./hooks";
import { ProjectCard } from "./ProjectCard";
import { ProjectFormModal } from "./ProjectFormModal";

type FormState = { mode: "create" } | { mode: "edit"; project: ProjectDto };

export function ProjectsPage() {
  useDocumentTitle("Projects");
  const projects = useProjects();
  const deleteProject = useDeleteProject();
  const [form, setForm] = useState<FormState | null>(null);
  const [toDelete, setToDelete] = useState<ProjectDto | null>(null);

  const newProjectButton = (
    <Button variant="primary" onClick={() => setForm({ mode: "create" })}>
      New project
    </Button>
  );

  function renderContent() {
    if (projects.isPending) {
      return (
        <div className="grid" aria-busy="true" aria-label="Loading projects">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="skeleton-card" />
          ))}
        </div>
      );
    }
    if (projects.isError) {
      return <ErrorState error={projects.error} title="Could not load projects" onRetry={() => void projects.refetch()} />;
    }
    if (projects.data.length === 0) {
      return (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start organising tasks."
          action={newProjectButton}
        />
      );
    }
    return (
      <div className="grid">
        {projects.data.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onEdit={(target) => setForm({ mode: "edit", project: target })}
            onDelete={setToDelete}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="muted">Everything you are working on, at a glance.</p>
        </div>
        {projects.data && projects.data.length > 0 && newProjectButton}
      </div>

      {renderContent()}

      {form && (
        <ProjectFormModal project={form.mode === "edit" ? form.project : undefined} onClose={() => setForm(null)} />
      )}
      {toDelete && (
        <ConfirmDialog
          title="Delete project"
          message={`Delete "${toDelete.name}" and all of its tasks? This cannot be undone.`}
          pending={deleteProject.isPending}
          onCancel={() => setToDelete(null)}
          onConfirm={() => deleteProject.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
        />
      )}
    </>
  );
}
