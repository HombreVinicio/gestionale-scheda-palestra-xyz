import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Dumbbell,
  Info,
  Plus,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyBlock } from "@/components/app-shell";
import { useTraining } from "@/components/training-provider";
import {
  beginSession,
  cursor,
  blockDays,
  formatDate,
  volume,
  type Day,
} from "@/lib/training";
import trainingImage from "@/assets/training.jpg";
import { PlanNotes } from "@/components/plan-notes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SERIE · Il tuo allenamento" },
      {
        name: "description",
        content: "Scheda attiva e registrazione di peso e ripetizioni per ogni serie.",
      },
      { property: "og:title", content: "SERIE · Il tuo allenamento" },
      {
        property: "og:description",
        content: "Scheda attiva, sessioni e risultati degli allenamenti.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrainingHome,
});
function TrainingHome() {
  const { state, update, ready } = useTraining();
  const navigate = useNavigate();
  const [chosenDay, setChosenDay] = useState<Day | null>(null);
  const block = state.blocks.find((b) => b.id === state.activeBlockId);
  const current = state.sessions.find((s) => s.id === state.currentSessionId);
  if (!block) return <EmptyBlock />;
  const position = cursor(state, block.id);
  const order = blockDays(block);
  const selected =
    current?.day ?? (chosenDay && order.includes(chosenDay) ? chosenDay : position.day);
  const exercises = current?.snapshot?.exercises ?? block.plan[selected] ?? [];
  const latest = state.sessions
    .filter((s) => s.blockId === block.id && s.closedAt)
    .sort((a, b) => b.order - a.order)[0];
  const completedDays = state.sessions
    .filter((s) => s.blockId === block.id && s.week === position.week && s.closedAt)
    .map((s) => s.day);
  const start = () => {
    update((s) => beginSession(s, selected));
    void navigate({ to: "/sessione" });
  };
  return (
    <>
      <section className="hero">
        <img
          className="hero-image"
          src={trainingImage}
          alt="Manubri e attrezzatura in palestra"
          width={1536}
          height={1024}
        />
        <div className="hero-content">
          <div className="hero-meta">
            <span>
              {block.name} · Settimana {current?.week ?? position.week}
            </span>
            <span className="tag tag-lime">{current ? "IN CORSO" : "ATTIVO"}</span>
            <Button asChild variant="outline" className="new-block-action">
              <Link to="/nuovo-blocco">
                <Plus /> Nuovo blocco
              </Link>
            </Button>
          </div>
          <h1>Giorno {selected}</h1>
          <div className="hero-description">
            <span>
              <Dumbbell size={14} />
              {exercises.length} esercizi · {exercises.reduce((s, e) => s + e.sets, 0)} serie
            </span>
          </div>
          <Button className="hero-cta" disabled={!ready} onClick={start}>
            {current ? "Riprendi allenamento" : "Inizia allenamento"}
            <ArrowRight />
          </Button>
        </div>
      </section>
      <div className="dashboard-grid">
        <section>
          <div className="section-heading">
            <h2>Scheda</h2>
            <Button asChild variant="outline">
              <Link to="/modifica-blocco">
                <Pencil />
                Modifica blocco
              </Link>
            </Button>
          </div>
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
          <PlanNotes {...block.dayNotes?.[selected]} />
          {Boolean(block.pendingNotes?.length) && (
            <p className="notice">
              {block.pendingNotes?.length} indicazioni da verificare in Modifica blocco.
            </p>
          )}
          <div className="day-selector" aria-label="Scegli giornata">
            {order.map((d) => (
              <Button
                key={d}
                variant="ghost"
                className={d === selected ? "selected" : ""}
                disabled={Boolean(current) && d !== selected}
                onClick={() => setChosenDay(d)}
              >
                Giorno {d}
                {completedDays.includes(d) && <Check size={12} />}
              </Button>
            ))}
          </div>
          {exercises.map((e, i) => (
            <div className="exercise-preview" key={e.id}>
              <span className="exercise-number">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{e.name}</h3>
                <p>
                  {e.sets} serie <span className="accent-text">×</span> {e.reps} ripetizioni
                </p>
                <PlanNotes coach={e.note} personal={e.personalNote ?? ""} />
              </div>
            </div>
          ))}
        </section>
        <aside>
          <section className="cycle">
            <div className="section-heading">
              <h2>Blocco attivo</h2>
              <span className="tag tag-lime">ATTIVO</span>
            </div>
            <div className="flex justify-between">
              <span className="tiny text-muted">{block.name}</span>
              <span className="tiny">Settimana {position.week}</span>
            </div>
            <div className="cycle-days">
              {order.map((d) => (
                <div
                  className={`cycle-item ${completedDays.includes(d) ? "done" : d === position.day ? "next" : ""}`}
                  key={d}
                >
                  <span>{completedDays.includes(d) ? <Check size={15} /> : d}</span>
                  <p>
                    {completedDays.includes(d)
                      ? "Completato"
                      : d === position.day
                        ? "Il prossimo"
                        : "Da fare"}
                  </p>
                </div>
              ))}
            </div>
            <div className="progress-track">
              <progress
                value={new Set(completedDays).size}
                max={order.length}
                aria-label="Giornate completate nella settimana"
              />
            </div>
            <div className="flex justify-between tiny text-muted">
              <span>
                {new Set(completedDays).size} di {order.length} allenamenti
              </span>
            </div>
          </section>
          <div className="section-heading">
            <h2>Ultimo allenamento</h2>
            <Link to="/storico" className="tiny accent-text">
              Vedi tutti <ArrowUpRight size={12} className="inline" />
            </Link>
          </div>
          {latest ? (
            <Link to="/storico" search={{ sessione: latest.id }} className="last-session block">
              <div className="last-session-top">
                <span className="session-icon">
                  <Check size={18} />
                </span>
                <div>
                  <h3>Giorno {latest.day}</h3>
                  <p className="tiny text-muted">
                    {formatDate(latest.startedAt)} · Settimana {latest.week}
                  </p>
                </div>
                <ChevronRight size={16} className="ml-auto text-muted" />
              </div>
              <div className="last-session-stats">
                <div>
                  <strong>
                    {
                      Object.values(latest.results)
                        .flat()
                        .filter((s) => s.done).length
                    }
                  </strong>
                  <p>Serie completate</p>
                </div>
                <div>
                  <strong>
                    {volume(latest).toLocaleString("it-IT")}{" "}
                    <span className="tiny text-muted">kg</span>
                  </strong>
                  <p>Volume totale</p>
                </div>
              </div>
            </Link>
          ) : (
            <p className="text-muted tiny">Nessun allenamento completato.</p>
          )}
          {block.demo && (
            <div className="demo-notice">
              <Info size={14} />
              <p>Scheda dimostrativa · Le sessioni DEMO non sono risultati personali.</p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
