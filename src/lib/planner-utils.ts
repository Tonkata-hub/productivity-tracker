export function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function minutesToClockTimeStr(minutes: number): string {
  const minutesPerDay = 24 * 60;
  const normalizedMinutes = ((minutes % minutesPerDay) + minutesPerDay) % minutesPerDay;
  const h = Math.floor(normalizedMinutes / 60);
  const m = normalizedMinutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function minutesToClockTimeStrPadded(minutes: number): string {
  const minutesPerDay = 24 * 60;
  const normalizedMinutes = ((minutes % minutesPerDay) + minutesPerDay) % minutesPerDay;
  const h = Math.floor(normalizedMinutes / 60);
  const m = normalizedMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatTargetValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

export function formatPlannerTaskTitle(title: string, targetValue: number | null, unit: string | null): string {
  if (targetValue == null || !Number.isFinite(targetValue)) return title;

  const valueLabel = formatTargetValue(targetValue);
  const unitLabel = unit?.trim();
  const amountLabel = unitLabel ? `${valueLabel} ${unitLabel}` : valueLabel;
  const normalizedTitle = title.trim();

  if (normalizedTitle.toLowerCase().includes(amountLabel.toLowerCase())) {
    return normalizedTitle;
  }

  return `${normalizedTitle} ${amountLabel}`.trim();
}
