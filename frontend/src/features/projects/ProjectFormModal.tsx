import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { ProjectDto, ProjectInput } from "@/api/types";
import { Button } from "@/components/Button";
import { TextAreaField, TextField } from "@/components/fields";
import { Modal } from "@/components/Modal";
import { applyFieldErrors } from "@/lib/formErrors";
import { useCreateProject, useUpdateProject } from "./hooks";
import { projectSchema, type ProjectFormValues } from "./schemas";

interface ProjectFormModalProps {
  /** Omit to create a new project. */
  project?: ProjectDto;
  onClose: () => void;
}

export function ProjectFormModal({ project, onClose }: ProjectFormModalProps) {
  const create = useCreateProject();
  const update = useUpdateProject(project?.id ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: project?.name ?? "", description: project?.description ?? "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const input: ProjectInput = { name: values.name, description: values.description.trim() || null };
    setFormError(null);
    try {
      await (project ? update.mutateAsync(input) : create.mutateAsync(input));
      onClose();
    } catch (error) {
      setFormError(applyFieldErrors(error, setError, ["name", "description"]));
    }
  });

  return (
    <Modal title={project ? "Edit project" : "New project"} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className="form">
        {formError && (
          <div className="form-alert" role="alert">
            {formError}
          </div>
        )}
        <TextField label="Name" error={errors.name?.message} {...register("name")} />
        <TextAreaField label="Description (optional)" error={errors.description?.message} {...register("description")} />
        <div className="modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {project ? "Save changes" : "Create project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
