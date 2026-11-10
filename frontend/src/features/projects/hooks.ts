import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createProject, deleteProject, getProject, listProjects, updateProject } from "@/api/projects";
import { queryKeys } from "@/api/queryKeys";
import type { ProjectInput } from "@/api/types";
import { useMutationErrorToast, useToast } from "@/components/useToast";

export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects.list(), queryFn: listProjects });
}

export function useProject(id: string) {
  return useQuery({ queryKey: queryKeys.projects.detail(id), queryFn: () => getProject(id) });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const onError = useMutationErrorToast();
  return useMutation({
    mutationFn: (input: ProjectInput) => createProject(input),
    onSuccess: (project) => toast.success(`Project "${project.name}" created`),
    onError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const onError = useMutationErrorToast();
  return useMutation({
    mutationFn: (input: ProjectInput) => updateProject(id, input),
    onSuccess: () => toast.success("Project updated"),
    onError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const onError = useMutationErrorToast();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: (_data, id) => {
      toast.success("Project deleted");
      queryClient.removeQueries({ queryKey: queryKeys.tasks.project(id) });
    },
    onError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
  });
}
