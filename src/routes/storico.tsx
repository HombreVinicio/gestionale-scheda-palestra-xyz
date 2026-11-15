import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, ChevronRight, History, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/app-shell";
import { ConfirmModal } from "@/components/confirm-modal";
import { useTraining } from "@/components/training-provider";
import {
  blockDays,
  type Day,
  dayNames,
  formatDate,
  reopenSession,
  sessionSnapshot,
  volume,
} from "@/lib/training";
import { PlanNotes } from "@/components/plan-notes";
export const Route = createFileRoute("/storico")({
  validateSearch: (search: Record<string, unknown>): { sessione?: string | undefined } => ({
    sessione: typeof search["sessione"] === "string" ? search["sessione"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Storico e progressi · SERIE" },
      {
        name: "description",
        content: "Consulta blocchi, settimane e risultati di ogni allenamento.",
      },
      { property: "og:title", content: "Storico e progressi · SERIE" },
      {
        property: "og:description",
        content: "Blocchi, settimane e risultati delle sessioni completate.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrainingHistory,
});
function TrainingHistory() {
  const { state, update } = useTraining();
  const { sessione } = Route.useSearch();
  const navigate = useNavigate();
  const [chosenBlockId, setBlockId] = useState<string | null>(null);
  const blockId = chosenBlockId ?? state.activeBlockId ?? state.blocks[0]?.id ?? "";
  const [week, setWeek] = useState("tutte");
  const [confirm, setConfirm] = useState(false);
  const [planDay, setPlanDay] = useState<Day>("A");
  const [showPlan, setShowPlan] = useState(false);
  const selected = state.sessions.find((s) => s.id === sessione);
  const block = state.blocks.find((b) => b.id === (selected?.blockId ?? blockId));
  const snapshot = selected && block ? sessionSnapshot(selected, block) : null;
  if (selected && block)
    return (
      <div className="content-narrow">
        <Link to="/storico" search={{ sessione: undefined }} className="back-link">
          <ArrowLeft size={15} />
          Tutto lo storico
        </Link>
        <PageHeading
          eyebrow={`${snapshot?.blockName ?? block.name} · SETTIMANA ${selected.week}`}
          title={`Giorno ${selected.day}${dayNames[selected.day] ? ` · ${dayNames[selected.day]}` : ""}`}
        />
        <div className="session-summary">
          <span className="tag">{formatDate(selected.startedAt)}</span>
          <span className="tag tag-lime">{selected.closedAt ? "COMPLETATO" : "IN CORSO"}</span>
          {selected.demo && <span className="tag">ESEMPIO DIMOSTRATIVO</span>}
          <span className="ml-auto text-muted tiny">
            Volume {volume(selected).toLocaleString("it-IT")} kg
          </span>
        </div>
        <PlanNotes {...snapshot?.blockNotes} />
        <PlanNotes {...snapshot?.dayNotes} />
        {(snapshot?.exercises ?? []).map((e) => (
          <section className="workout-exercise" key={e.id}>
            <h3>{e.name}</h3>
            <p className="exercise-target">
              {e.sets} serie × {e.reps} ripetizioni
            </p>
            <PlanNotes coach={e.note} personal={e.personalNote ?? ""} />
            {selected.results[e.id]?.map((s, i) => (
              <div className="result-line" key={i}>
                <div>
                  <span>Serie {i + 1}</span>
                  {e.seriesTargets?.[i] && (
                    <p className="exercise-target">
                      {e.seriesTargets[i].role} · {e.seriesTargets[i].reps || "—"} rip.
                    </p>
                  )}
                  <PlanNotes {...e.seriesNotes?.[i]} />
                </div>
                <strong>
                  {s.weight || "—"} kg × {s.reps || "—"} rip.
                </strong>
                <span>{s.done ? <Check size={16} /> : "Non completata"}</span>
              </div>
            ))}
          </section>
        ))}
        {selected.closedAt && selected.blockId === state.activeBlockId && (
          <>
            <Button
              variant="outline"
              disabled={Boolean(state.currentSessionId)}
              onClick={() => setConfirm(true)}
            >
              <RotateCcw />
              Riapri allenamento
            </Button>
            {state.currentSessionId && (
              <p className="notice">
                Chiudi prima l’allenamento in corso per riaprire questa sessione.
              </p>
            )}
          </>
        )}
        {block.archived && (
          <p className="notice">Blocco archiviato: scheda e risultati restano consultabili.</p>
        )}
        {confirm && (
          <ConfirmModal
            title="Riaprire questo allenamento?"
            description="I valori registrati saranno conservati. La sessione non conterà come completata finché non la chiuderai di nuovo. Le sessioni successive restano nello storico e determinano l’avanzamento."
            confirm="Riapri"
            onCancel={() => setConfirm(false)}
            onConfirm={() => {
              update((s) => reopenSession(s, selected.id));
              void navigate({ to: "/sessione" });
            }}
          />
        )}
      </div>
    );
  const sessions = state.sessions
    .filter((s) => s.blockId === blockId && s.closedAt)
    .sort((a, b) => b.order - a.order);
  const weeks = [...new Set(sessions.map((s) => s.week))].sort((a, b) => b - a);
  return (
    <div className="content-narrow">
      <PageHeading title="Storico" />
      <div className="history-filters">
        <select
          aria-label="Blocco nello storico"
          className="field-input"
          value={blockId}
          onChange={(e) => {
            setBlockId(e.target.value);
            setWeek("tutte");
          }}
        >
          {state.blocks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.archived ? "· Archiviato" : "· Attivo"}
            </option>
          ))}
        </select>
        <select
          aria-label="Settimana nello storico"
          className="field-input"
          value={week}
          onChange={(e) => setWeek(e.target.value)}
        >
          <option value="tutte">Tutte le settimane</option>
          {weeks.map((w) => (
            <option value={w} key={w}>
              Settimana {w}
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={() => setShowPlan(!showPlan)}>
          {showPlan ? "Nascondi scheda" : "Consulta scheda"}
        </Button>
      </div>
      {showPlan && block && (
        <section className="mb-7">
          <PlanNotes {...block.notes} />
          {block.accessories?.length ? (
            <details className="editor-notes">
              <summary>Attività accessorie</summary>
              {block.accessories.map((a) => (
                <p className="coach-indication" key={a.id}>
                  {a.text}
                </p>
              ))}
            </details>
          ) : null}
          {Boolean(block.pendingNotes?.length) && (
            <div className="pending-section">
              <h2>Da verificare</h2>
              {block.pendingNotes?.map((n) => (
                <p className="coach-indication" key={n.id}>
                  {n.source} · {n.text}
                </p>
              ))}
            </div>
          )}
          <div className="day-selector">
            {blockDays(block).map((d) => (
              <Button
                key={d}
                variant="ghost"
                className={planDay === d ? "selected" : ""}
                onClick={() => setPlanDay(d)}
              >
                Giorno {d}
              </Button>
            ))}
          </div>
          <PlanNotes {...block.dayNotes?.[planDay]} />
          {(block.plan[planDay] ?? []).map((e) => (
            <div className="exercise-preview" key={e.id}>
              <div>
                <h3>{e.name}</h3>
                <p>
                  {e.sets} serie × {e.reps} ripetizioni
                </p>
                <PlanNotes coach={e.note} personal={e.personalNote ?? ""} />
                {e.seriesNotes?.slice(0, e.sets).map((n, i) =>
                  n.coach || n.personal ? (
                    <div className="archived-series-note" key={i}>
                      <span className="tiny text-muted">Serie {i + 1}</span>
                      <PlanNotes {...n} />
                    </div>
                  ) : null,
                )}
              </div>
            </div>
          ))}
        </section>
      )}
      {sessions.length === 0 ? (
        <div className="empty-state">
          <History size={36} />
          <h2>Nessun allenamento completato</h2>
        </div>
      ) : (
        weeks
          .filter((w) => week === "tutte" || String(w) === week)
          .map((w) => (
            <section key={w}>
              <h2 className="week-heading">SETTIMANA {w}</h2>
              {sessions
                .filter((s) => s.week === w)
                .map((s) => (
                  <Link
                    to="/storico"
                    search={{ sessione: s.id }}
                    className="session-list-item"
                    key={s.id}
                  >
                    <span className="session-icon">{s.day}</span>
                    <div className="details">
                      <h3>
                        Giorno {s.day} {dayNames[s.day] ? `· ${dayNames[s.day]}` : ""}
                      </h3>
                      <p>
                        {formatDate(s.startedAt)} ·{" "}
                        {
                          Object.values(s.results)
                            .flat()
                            .filter((r) => r.done).length
                        }{" "}
                        serie completate
                      </p>
                    </div>
                    {s.demo && <span className="tag">DEMO</span>}
                    <span className="session-volume">{volume(s).toLocaleString("it-IT")} kg</span>
                    <ChevronRight size={15} />
                  </Link>
                ))}
            </section>
          ))
      )}
      <p className="demo-notice">
        Le sessioni con etichetta DEMO sono esempi, non risultati personali.
      </p>
    </div>
  );
}
