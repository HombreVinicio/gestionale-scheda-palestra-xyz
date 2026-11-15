import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Dumbbell,
  Info,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyBlock, PageHeading } from "@/components/app-shell";
import { useTraining } from "@/components/training-provider";
import { beginSession, cursor, dayNames, days, formatDate, volume, type Day } from "@/lib/training";
import trainingImage from "@/assets/training.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SERIE · Il tuo allenamento" },
      {
        name: "description",
        content:
          "La tua scheda, i tuoi progressi. Registra ogni serie e continua il tuo percorso in palestra.",
      },
      { property: "og:title", content: "SERIE · Il tuo allenamento" },
      { property: "og:description", content: "Allenamenti e progressi, un giorno alla volta." },
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
  const selected = current?.day ?? chosenDay ?? position.day;
  const exercises = block.plan[selected];
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
      <PageHeading eyebrow="IL TUO PERCORSO, UNA SERIE ALLA VOLTA" title="Il prossimo passo è qui.">
        <Button asChild variant="outline" className="outline-action">
          <Link to="/nuovo-blocco">
            <Plus /> Nuovo blocco
          </Link>
        </Button>
      </PageHeading>
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
            <span className="tag tag-lime">{current ? "IN CORSO" : "PROSSIMO ALLENAMENTO"}</span>
            <span>
              {block.name} · Settimana {current?.week ?? position.week}
            </span>
          </div>
          <h2>
            Giorno {selected}
            <br />
            {dayNames[selected]}
          </h2>
          <div className="hero-description">
            <span>
              <Dumbbell size={14} />
              {exercises.length} esercizi · {exercises.reduce((s, e) => s + e.sets, 0)} serie
            </span>
            <span>
              <Clock3 size={14} />
              circa 55 min
            </span>
          </div>
          <Button className="hero-cta" disabled={!ready} onClick={start}>
            {current ? "Riprendi allenamento" : "Inizia allenamento"}
            <ArrowRight />
          </Button>
          <p className="hero-footnote">Il tuo ritmo. Nessun giorno fisso.</p>
        </div>
      </section>
      <div className="dashboard-grid">
        <section>
          <div className="section-heading">
            <h2>La scheda di oggi</h2>
            <span className="tiny text-muted">
              {block.name} <span className="accent-text">/</span> Giorno {selected}
            </span>
          </div>
          <div className="day-selector" aria-label="Scegli giornata">
            {days.map((d) => (
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
              </div>
              <span className="exercise-end tag">{e.muscle}</span>
            </div>
          ))}
          <p className="tiny text-muted mt-4">
            Prescrizione del coach · I risultati si registrano durante l’allenamento.
          </p>
        </section>
        <aside>
          <section className="cycle">
            <div className="section-heading">
              <h2>Il tuo blocco</h2>
              <span className="tag tag-lime">ATTIVO</span>
            </div>
            <div className="flex justify-between">
              <span className="tiny text-muted">{block.name}</span>
              <span className="tiny">Settimana {position.week}</span>
            </div>
            <div className="cycle-days">
              {days.map((d) => (
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
                max={4}
                aria-label="Giornate completate nella settimana"
              />
            </div>
            <div className="flex justify-between tiny text-muted">
              <span>{new Set(completedDays).size} di 4 allenamenti</span>
              <span>
                Un passo alla volta <ArrowUpRight size={12} className="inline" />
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
                  <h3>
                    Giorno {latest.day} · {dayNames[latest.day]}
                  </h3>
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
            <p className="text-muted tiny">Il primo allenamento ti aspetta.</p>
          )}
          {block.demo && (
            <div className="demo-notice">
              <Info size={14} />
              <p>
                Stai provando una scheda dimostrativa.
                <br />
                Le sessioni di esempio sono indicate nello storico. I tuoi nuovi risultati restano
                separati.
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
