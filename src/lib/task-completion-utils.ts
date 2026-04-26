export type CompletionOptionMap = Map<string, Set<number>>;

export type CompletionRow = {
  task_id: string;
  date: string;
  value: number | null;
  daily_option_index?: number | null;
};

export function cloneCompletionOptionMap(source: CompletionOptionMap): CompletionOptionMap {
  const clone = new Map<string, Set<number>>();
  for (const [key, value] of source.entries()) {
    clone.set(key, new Set(value));
  }
  return clone;
}

export function buildCompletionState(rows: CompletionRow[]) {
  const completionSet = new Set<string>();
  const quantValues = new Map<string, number>();
  const optionCompletions: CompletionOptionMap = new Map();

  for (const row of rows) {
    const key = `${row.task_id}:${row.date}`;

    if (row.value != null) {
      quantValues.set(key, (quantValues.get(key) ?? 0) + row.value);
      continue;
    }

    completionSet.add(key);

    if (Number.isInteger(row.daily_option_index) && (row.daily_option_index as number) >= 0) {
      const optionSet = optionCompletions.get(key) ?? new Set<number>();
      optionSet.add(row.daily_option_index as number);
      optionCompletions.set(key, optionSet);
    }
  }

  return { completionSet, quantValues, optionCompletions };
}
