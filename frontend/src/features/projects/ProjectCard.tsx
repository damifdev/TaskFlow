import { Link } from "react-router-dom";
import type { ProjectDto } from "@/api/types";
import { Button } from "@/components/Button";

interface ProjectCardProps {
  project: ProjectDto;
  onEdit: (project: ProjectDto) => void;
  onDelete: (project: ProjectDto) => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const percent = project.taskCount === 0 ? 0 : Math.round((project.doneCount / project.taskCount) * 100);

  return (
    <article className="card project-card">
      <h2 className="project-card-title">
        <Link to={`/projects/${project.id}`}>{project.name}</Link>
      </h2>
      <p className="project-card-description muted">{project.description ?? "No description"}</p>
      <div className="progress-block">
        <p className="progress-label numeric">
          {project.doneCount} of {project.taskCount} tasks done
        </p>
        <div
          className="progress"
          role="progressbar"
          aria-label={`${project.name} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="progress-bar" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <div className="card-actions">
        <Button size="sm" variant="ghost" onClick={() => onEdit(project)} aria-label={`Edit project ${project.name}`}>
          Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(project)} aria-label={`Delete project ${project.name}`}>
          Delete
        </Button>
      </div>
    </article>
  );
}
