import { useCallback, useState } from "react";

export type TaskView = "list" | "board";

const STORAGE_KEY = "taskflow.taskView";

function readStoredView(): TaskView {
  try {
    return localStorage.getItem(STORAGE_KEY) === "board" ? "board" : "list";
  } catch {
    return "list";
  }
}

/** The List/Board choice, remembered across visits. */
export function useTaskView(): [TaskView, (view: TaskView) => void] {
  const [view, setView] = useState<TaskView>(readStoredView);

  const changeView = useCallback((next: TaskView) => {
    setView(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the choice simply will not persist.
    }
  }, []);

  return [view, changeView];
}
