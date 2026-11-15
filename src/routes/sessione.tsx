import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, CheckCheck, Info, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/app-shell";
import { ConfirmModal } from "@/components/confirm-modal";
import { useTraining } from "@/components/training-provider";
import { closeSession, dayNames } from "@/lib/training";
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
        content: "Ogni serie conta. Segui la tua scheda e salva i tuoi risultati.",
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
        <p>La tua scheda ti aspetta.</p>
        <Button asChild>
          <Link to="/">Vai all’allenamento</Link>
        </Button>
      </div>
    );
  const all = Object.values(session.results).flat();
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
        eyebrow={`${block.name} · SETTIMANA ${session.week}`}
        title={`Giorno ${session.day} · ${dayNames[session.day]}`}
      />
      <div className="session-summary">
        <span className="tag">
          {count} / {all.length} serie
        </span>
        <span className="save-status">
          <LockKeyhole size={12} />
          {saveError ? "Salvataggio non riuscito" : "Salvato sul dispositivo"}
        </span>
      </div>
      {block.plan[session.day].map((e, i) => {
        const prev = state.sessions
          .filter(
            (s) => s.id !== session.id && s.closedAt && s.blockId === block.id && s.results[e.id],
          )
          .sort((a, b) => b.order - a.order)[0];
        return (
          <section className="workout-exercise" key={e.id}>
            <div className="workout-exercise-title">
              <span className="exercise-number">{String(i + 1).padStart(2, "0")}</span>
              <h3>{e.name}</h3>
            </div>
            <div className="prescription">
              <span className="tag tag-lime">COACH</span>
              <strong>
                {e.sets} serie × {e.reps} ripetizioni
              </strong>
            </div>
            {e.note && (
              <div className="coach-note">
                <Info size={14} />
                {e.note}
              </div>
            )}
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
              </div>
            ))}
            <p className="previous-results">
              {prev
                ? `Ultima sessione${prev.demo ? " · esempio dimostrativo" : ""}: ${prev.results[e.id]?.map((r, j) => `${j + 1}ª ${r.weight || "—"} kg × ${r.reps || "—"}`).join(" · ")}`
                : "Nessuna sessione precedente per questo esercizio."}
            </p>
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
