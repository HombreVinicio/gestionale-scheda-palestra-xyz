import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, CheckCheck, LockKeyhole, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/app-shell";
import { ConfirmModal } from "@/components/confirm-modal";
import { useTraining } from "@/components/training-provider";
import { closeSession, previousCompletedSession, sessionSnapshot } from "@/lib/training";
import { PlanNotes } from "@/components/plan-notes";
export const Route = createFileRoute("/sessione")({
  head: () => ({
    meta: [
      { title: "Allenamento in corso · SERIE" },
      {
        name: "description",
        content: "Registra peso e ripetizioni per ogni serie del tuo allenamento.",
      },
      { property: "og:title", content: "Allenamento in corso · SERIE" },
      {
        property: "og:description",
        content: "Serie previste, risultati precedenti e registrazione di peso e ripetizioni.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Workout,
});
function Workout() {
  const { state, update, ready, saveError } = useTraining();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const session = state.sessions.find((s) => s.id === state.currentSessionId);
  const block = state.blocks.find((b) => b.id === session?.blockId);
  if (!ready) return <p className="text-muted">Caricamento allenamento…</p>;
  if (!session || !block)
    return (
      <div className="empty-state">
        <CheckCheck size={40} />
        <h2>Nessun allenamento in corso</h2>
        <Button asChild>
          <Link to="/">Vai all’allenamento</Link>
        </Button>
      </div>
    );
  const all = Object.values(session.results).flat();
  const snapshot = sessionSnapshot(session, block);
  const previous = previousCompletedSession(state, session);
  const count = all.filter((s) => s.done).length;
  const change = (
    exerciseId: string,
    index: number,
    field: "weight" | "reps" | "done",
    value: string | boolean,
  ) =>
    update((s) => ({
      ...s,
      sessions: s.sessions.map((x) =>
        x.id === session.id
          ? {
              ...x,
              results: {
                ...x.results,
                [exerciseId]: (x.results[exerciseId] ?? []).map((row, i) =>
                  i === index
                    ? { ...row, [field]: value, ...(field !== "done" ? { done: false } : {}) }
                    : row,
                ),
              },
            }
          : x,
      ),
    }));
  return (
    <div className="content-narrow">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} /> Allenamento
      </Link>
      <PageHeading
        eyebrow={`${snapshot.blockName} · SETTIMANA ${session.week}`}
        title={`Giorno ${session.day}`}
      />
      <div className="session-summary">
        <span className="tag">
          {count} / {all.length} serie
        </span>
        <Button asChild variant="ghost" size="icon" title="Modifica blocco">
          <Link to="/modifica-blocco" aria-label="Modifica blocco">
            <Pencil />
          </Link>
        </Button>
        <span className="save-status">
          <LockKeyhole size={12} />
          {saveError ? "Salvataggio non riuscito" : "Salvato sul dispositivo"}
        </span>
      </div>
      <PlanNotes {...snapshot.blockNotes} />
      <PlanNotes {...snapshot.dayNotes} />
      {block.pendingNotes?.length ? (
        <p className="notice">
          {block.pendingNotes.length} indicazioni da verificare nella{" "}
          <Link to="/modifica-blocco" className="accent-text">
            scheda
          </Link>
          .
        </p>
      ) : null}
      {snapshot.exercises.map((e, i) => {
        return (
          <section className="workout-exercise" key={e.id}>
            <div className="workout-exercise-title">
              <span className="exercise-number">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{e.name}</h3>
                <p className="exercise-target">
                  {e.sets} serie × {e.reps} ripetizioni
                </p>
              </div>
            </div>
            <PlanNotes coach={e.note} personal={e.personalNote ?? ""} />
            <div className="set-row labels">
              <span>Serie</span>
              <span className="text-center">Peso · kg</span>
              <span className="text-center">Rip. eseguite</span>
              <span className="text-center">Fatto</span>
            </div>
            {(session.results[e.id] ?? []).map((row, j) => (
              <div className="set-row" key={j}>
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
                  onClick={() => change(e.id, j, "done", !row.done)}
                >
                  <Check />
                </Button>
                <p className="set-previous">
                  {e.seriesTargets?.[j] && (
                    <span>
                      {e.seriesTargets[j].role} · {e.seriesTargets[j].reps || "—"} rip. ·{" "}
                    </span>
                  )}
                  Serie {j + 1} · Prec.:{" "}
                  {previous?.results[e.id]?.[j]?.weight || previous?.results[e.id]?.[j]?.reps
                    ? `${previous.results[e.id]?.[j]?.weight || "—"} kg × ${previous.results[e.id]?.[j]?.reps || "—"}`
                    : "—"}
                  {previous?.demo &&
                  (previous.results[e.id]?.[j]?.weight || previous.results[e.id]?.[j]?.reps)
                    ? " · esempio"
                    : ""}
                </p>
                {(e.seriesNotes?.[j]?.coach || e.seriesNotes?.[j]?.personal) && (
                  <div className="set-indication">
                    <PlanNotes {...e.seriesNotes[j]} />
                  </div>
                )}
              </div>
            ))}
          </section>
        );
      })}
      <div className="sticky-action">
        <span className="tiny text-muted">
          {count} di {all.length} serie completate
        </span>
        <Button onClick={() => setConfirm(true)}>
          <CheckCheck />
          Chiudi allenamento
        </Button>
      </div>
      {confirm && (
        <ConfirmModal
          title="Chiudere l’allenamento?"
          description={
            count === all.length
              ? "Tutte le serie sono completate. I risultati saranno aggiunti allo storico e sarà proposta la giornata successiva."
              : `Hai completato ${count} di ${all.length} serie. I valori inseriti saranno conservati, anche quelli delle serie non completate. La giornata successiva sarà proposta.`
          }
          confirm="Conferma chiusura"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            update((s) => closeSession(s, session.id));
            setConfirm(false);
            void navigate({ to: "/" });
          }}
        />
      )}
    </div>
  );
}
