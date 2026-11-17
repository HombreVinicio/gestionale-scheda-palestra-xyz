import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanNotes } from "@/components/plan-notes";
import { exerciseProgress, type Exercise, type Session } from "@/lib/training";

type Props = {
  exercise: Exercise;
  index: number;
  rows: Session["results"][string];
  previous: Session | undefined;
  change: (
    exerciseId: string,
    index: number,
    field: "weight" | "reps" | "done",
    value: string | boolean,
  ) => void;
};

export function WorkoutExercise({ exercise: e, index, rows, previous, change }: Props) {
  const [showAll, setShowAll] = useState(false);
  const { remaining, complete } = exerciseProgress(rows);
  const expanded = !complete || showAll;
  return (
    <section className={`workout-exercise ${expanded ? "" : "is-collapsed"}`}>
      <Button
        variant="ghost"
        className="workout-exercise-toggle"
        aria-label={`${e.name}, ${showAll ? "chiudi dettagli" : "apri tutte le serie"}`}
        aria-expanded={expanded}
        onClick={() => setShowAll(!showAll)}
      >
        {expanded && <span className="exercise-number">{String(index + 1).padStart(2, "0")}</span>}
        <span className="workout-exercise-name">{e.name}</span>
        {complete && <Check className="accent-text shrink-0" aria-label="Esercizio completato" />}
      </Button>
      {expanded && (
        <>
          <p className="exercise-target">
            {e.sets} serie × {e.reps} ripetizioni
          </p>
          <PlanNotes coach={e.note} personal={e.personalNote ?? ""} />
          <div className="set-row labels">
            <span>Serie</span>
            <span className="text-center">Peso · kg</span>
            <span className="text-center">Rip. eseguite</span>
            <span className="text-center">Fatto</span>
          </div>
          {rows.map((row, j) => {
            if (row.done && !showAll) return null;
            const prior = previous?.results[e.id]?.[j];
            return (
              <div className="set-row" key={j}>
                <div className="set-prescription">
                  <span>
                    Serie {j + 1}
                    {e.seriesTargets?.[j]?.role ? ` · ${e.seriesTargets[j].role}` : ""}
                  </span>
                  <strong>
                    {e.seriesTargets?.[j]?.reps || e.reps || "—"} <span>rip.</span>
                  </strong>
                </div>
                <span className="text-muted text-center">{j + 1}</span>
                <input
                  className="set-input"
                  type="text"
                  inputMode="decimal"
                  aria-label={`${e.name}, serie ${j + 1}, peso`}
                  placeholder="—"
                  value={row.weight}
                  onChange={(event) => {
                    const v = event.target.value.replace(",", ".");
                    if (/^\d*(\.\d*)?$/.test(v)) change(e.id, j, "weight", v);
                  }}
                />
                <input
                  className="set-input"
                  type="text"
                  inputMode="numeric"
                  aria-label={`${e.name}, serie ${j + 1}, ripetizioni`}
                  placeholder="—"
                  value={row.reps}
                  onChange={(event) => {
                    if (/^\d*$/.test(event.target.value))
                      change(e.id, j, "reps", event.target.value);
                  }}
                />
                <Button
                  variant="outline"
                  className={`set-complete ${row.done ? "is-done" : ""}`}
                  aria-label={`${row.done ? "Annulla completamento" : "Completa"} ${e.name}, serie ${j + 1}`}
                  aria-pressed={row.done}
                  disabled={
                    row.weight === "" || row.reps === "" || !Number.isFinite(Number(row.weight))
                  }
                  onClick={() => {
                    if (!row.done && remaining === 1) setShowAll(false);
                    change(e.id, j, "done", !row.done);
                  }}
                >
                  <Check />
                </Button>
                <span className="set-previous-label">Prec.</span>
                <p
                  className="set-previous set-previous-weight"
                  aria-label={`${e.name}, serie ${j + 1}, peso precedente`}
                >
                  {prior?.weight ? `${prior.weight} kg` : "—"}
                  {previous?.demo && prior?.weight ? " · esempio" : ""}
                </p>
                <p
                  className="set-previous set-previous-reps"
                  aria-label={`${e.name}, serie ${j + 1}, ripetizioni precedenti`}
                >
                  {prior?.reps || "—"}
                  {previous?.demo && prior?.reps ? " · esempio" : ""}
                </p>
                {(e.seriesNotes?.[j]?.coach || e.seriesNotes?.[j]?.personal) && (
                  <div className="set-indication">
                    <PlanNotes {...e.seriesNotes[j]} />
                  </div>
                )}
              </div>
            );
          })}
          <p className="exercise-remaining">
            {remaining} {remaining === 1 ? "serie mancante" : "serie mancanti"}
          </p>
        </>
      )}
    </section>
  );
}
