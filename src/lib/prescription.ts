import type { Exercise } from "@/lib/training";

export function repetitionRange(raw: string): string | null {
  const match = /^(\d+)\s*(?:[\/–-]\s*(\d+))?\s*(?:rip\.?|reps)?$/i.exec(raw.trim());
  return match ? `${match[1]}${match[2] ? `–${match[2]}` : ""}` : null;
}

export function splitSeriesRanges(raw: string, count: number): string[] | null {
  const parts = raw
    .split(/\+|\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (count <= 1 || parts.length !== count) return null;
  const ranges = parts.map(repetitionRange);
  if (ranges.some((range) => range === null)) return null;
  return ranges.filter((range): range is string => range !== null);
}

/** Resolve older imports without changing recorded sessions or results. */
export function exerciseSeriesTargets(exercise: Exercise) {
  const split = splitSeriesRanges(exercise.reps, exercise.sets);
  const repeatedAggregate =
    exercise.seriesTargets?.length === exercise.sets &&
    exercise.seriesTargets.every((target) => target.reps === exercise.reps);
  return Array.from({ length: exercise.sets }, (_, index) => {
    const target = exercise.seriesTargets?.[index];
    if (split && (!exercise.seriesTargets || repeatedAggregate))
      return { role: target?.role ?? "", reps: split[index] ?? "" };
    if (exercise.seriesTargets) return target ?? { role: "", reps: "" };
    // A mismatched aggregate is ambiguous, not a prescription to repeat on every set.
    return { role: "", reps: exercise.reps.includes("+") ? "" : exercise.reps };
  });
}

export function changeExerciseSeries(
  exercise: Exercise,
  index: number,
  patch: Partial<{ role: string; reps: string }>,
): Exercise {
  if (index < 0 || index >= exercise.sets) return exercise;
  const targets = exerciseSeriesTargets(exercise);
  const current = targets[index];
  if (!current) return exercise;
  targets[index] = { ...current, ...patch };
  return { ...exercise, seriesTargets: targets, reps: targets.map((t) => t.reps).join(" + ") };
}

export function resizeExerciseSeries(exercise: Exercise, count: number): Exercise {
  if (!Number.isInteger(count) || count < 1 || count > 12) return exercise;
  const current = exerciseSeriesTargets(exercise);
  const common = current.every((t) => t.reps === current[0]?.reps) ? (current[0]?.reps ?? "") : "";
  const targets = Array.from(
    { length: count },
    (_, index) => current[index] ?? { role: "", reps: common },
  );
  return {
    ...exercise,
    sets: count,
    seriesTargets: targets,
    seriesNotes: (exercise.seriesNotes ?? []).slice(0, count),
    reps: targets.map((t) => t.reps).join(" + "),
  };
}

export function setExerciseRepetitions(exercise: Exercise, raw: string): Exercise {
  const split = splitSeriesRanges(raw, exercise.sets);
  const targets = exerciseSeriesTargets(exercise).map((target, index) => ({
    ...target,
    reps: split?.[index] ?? (raw.includes("+") ? "" : raw),
  }));
  return { ...exercise, reps: split ? split.join(" + ") : raw, seriesTargets: targets };
}

export function validExercisePrescription(exercise: Exercise): boolean {
  return (
    Number.isInteger(exercise.sets) &&
    exercise.sets >= 1 &&
    exercise.sets <= 12 &&
    exerciseSeriesTargets(exercise).every((target) => Boolean(target.reps.trim()))
  );
}
