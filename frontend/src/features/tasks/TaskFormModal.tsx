import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { TASK_PRIORITIES, TASK_STATUSES, type TaskDto } from "@/api/types";
import { Button } from "@/components/Button";
import { SelectField, TextAreaField, TextField } from "@/components/fields";
import { Modal } from "@/components/Modal";
import { STATUS_LABELS } from "@/components/taskLabels";
import { applyFieldErrors } from "@/lib/formErrors";
import { useCreateTask, useUpdateTask } from "./hooks";
import { taskSchema, type TaskFormValues } from "./schemas";

interface TaskFormModalProps {
  projectId: string;
  /** Omit to create a new task. */
  task?: TaskDto;
  onClose: () => void;
}

export function TaskFormModal({ projectId, task, onClose }: TaskFormModalProps) {
  const create = useCreateTask(projectId);
  const update = useUpdateTask(projectId);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      priority: task?.priority ?? "Medium",
      status: task?.status ?? "Todo",
      dueDate: task?.dueDate ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const input = {
      title: values.title,
      description: values.description.trim() || null,
      priority: values.priority,
      dueDate: values.dueDate || null,
    };
    setFormError(null);
    try {
      if (task) await update.mutateAsync({ id: task.id, input: { ...input, status: values.status } });
      else await create.mutateAsync(input);
      onClose();
    } catch (error) {
      setFormError(
        applyFieldErrors(error, setError, ["title", "description", "priority", "status", "dueDate"]),
      );
    }
  });

  return (
    <Modal title={task ? "Edit task" : "New task"} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className="form">
        {formError && (
          <div className="form-alert" role="alert">
            {formError}
          </div>
        )}
        <TextField label="Title" error={errors.title?.message} {...register("title")} />
        <TextAreaField
          label="Description (optional)"
          error={errors.description?.message}
          {...register("description")}
        />
        <div className="form-row">
          <SelectField label="Priority" error={errors.priority?.message} {...register("priority")}>
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </SelectField>
          {task && (
            <SelectField label="Status" error={errors.status?.message} {...register("status")}>
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </SelectField>
          )}
          <TextField label="Due date (optional)" type="date" error={errors.dueDate?.message} {...register("dueDate")} />
        </div>
        <div className="modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {task ? "Save changes" : "Create task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
