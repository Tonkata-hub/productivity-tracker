export type DailyTaskMode = "single" | "multi_option";

import type { Task } from "./types";

export function normalizeDailyOptions(raw: unknown): string[] {
  const options = Array.isArray(raw) ? raw : [];
  const deduped = new Set<string>();

  for (const entry of options) {
    if (typeof entry !== "string") continue;
    const value = entry.trim();
    if (!value) continue;
    deduped.add(value);
  }

  return Array.from(deduped);
}

export function normalizeDailyMode(raw: unknown): DailyTaskMode {
  return raw === "multi_option" ? "multi_option" : "single";
}

export function normalizeTask(task: Task): Task {
  return {
    ...task,
    daily_mode: normalizeDailyMode(task.daily_mode),
    daily_options: normalizeDailyOptions(task.daily_options),
  };
}

export function normalizeTasks(tasks: Task[]): Task[] {
  return tasks.map(normalizeTask);
}

export function isMultiOptionDailyTask(task: Pick<Task, "type" | "target_value" | "daily_mode" | "daily_options">): boolean {
  return (
    task.type === "daily" &&
    task.target_value == null &&
    normalizeDailyMode(task.daily_mode) === "multi_option" &&
    normalizeDailyOptions(task.daily_options).length > 0
  );
}

export function parseDailyOptionsInput(value: string): string[] {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const deduped = new Set<string>();
  for (const line of lines) {
    deduped.add(line);
  }

  return Array.from(deduped);
}

export function formatDailyOptionsInput(options: string[] | null | undefined): string {
  return normalizeDailyOptions(options).join("\n");
}

export function completionOptionKey(taskId: string, date: string): string {
  return `${taskId}:${date}`;
}
