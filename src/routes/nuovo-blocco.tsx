import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileText, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/app-shell";
import { ConfirmModal } from "@/components/confirm-modal";
import { useTraining } from "@/components/training-provider";
import { days, dayNames, demoPlan, type Block, type Day, type Exercise } from "@/lib/training";
export const Route = createFileRoute("/nuovo-blocco")({
  head: () => ({
    meta: [
      { title: "Nuovo blocco · SERIE" },
      {
        name: "description",
        content: "Controlla la tua scheda e prepara un nuovo blocco di allenamenti.",
      },
      { property: "og:title", content: "Nuovo blocco · SERIE" },
      { property: "og:description", content: "Prepara il prossimo capitolo del tuo percorso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewBlock,
});
function NewBlock() {
  const { state, update } = useTraining();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [day, setDay] = useState<Day>("A");
  const [filename, setFilename] = useState("");
  const [plan, setPlan] = useState<Block["plan"]>(demoPlan);
  const [name, setName] = useState(`Blocco ${state.blocks.length + 1}`);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const edit = (id: string, key: keyof Exercise, value: string | number) =>
    setPlan((p) => ({
      ...p,
      [day]: p[day].map((e) => (e.id === id ? { ...e, [key]: value } : e)),
    }));
  const valid =
    name.trim() &&
    days.every(
      (d) =>
        plan[d].length > 0 &&
        plan[d].every((e) => e.name.trim() && e.reps.trim() && e.sets >= 1 && e.sets <= 12),
    );
  return (
    <div className="content-narrow">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} /> Allenamento
      </Link>
      <PageHeading
        eyebrow="UN NUOVO CAPITOLO"
        title={step === 1 ? "Nuovo blocco" : "Controlla la scheda"}
      />
      <div className="steps">
        <span className={step === 1 ? "current" : ""}>01 · Carica PDF</span>
        <ArrowRight size={13} />
        <span className={step === 2 ? "current" : ""}>02 · Controlla la scheda</span>
        <ArrowRight size={13} />
        <span>03 · Attiva blocco</span>
      </div>
      {state.currentSessionId ? (
        <div className="notice">
          Hai un allenamento in corso.{" "}
          <Link to="/sessione" className="accent-text">
            Riprendilo e chiudilo
          </Link>{" "}
          prima di attivare un nuovo blocco.
        </div>
      ) : step === 1 ? (
        <>
          <div className="notice">
            <strong className="accent-text">Anteprima dimostrativa</strong>
            <br />
            In questa versione il PDF non viene letto. Scegliendo un documento verrà aperta una
            scheda di esempio, che puoi correggere prima di attivare. Il PDF non viene salvato né
            inviato online.
          </div>
          <div className="upload-zone">
            <Upload size={36} />
            <h2>La scheda del tuo coach</h2>
            <p>Seleziona un PDF per provare il percorso di controllo.</p>
            <Button onClick={() => fileRef.current?.click()}>
              <Plus />
              Carica PDF del coach
            </Button>
            <div className="mt-5">
              <Button
                variant="link"
                onClick={() => {
                  setFilename("");
                  setStep(2);
                }}
              >
                Prova senza PDF <ArrowRight />
              </Button>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            aria-label="PDF del coach"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (!file.name.toLowerCase().endsWith(".pdf")) {
                setError("Scegli un documento PDF.");
                return;
              }
              setFilename(file.name);
              setStep(2);
            }}
          />
          {error && <p className="error-message">{error}</p>}
        </>
      ) : (
        <>
          <div className="notice">
            <FileText size={15} className="inline mr-2" />
            <strong>Anteprima dimostrativa · PDF non letto</strong>
            <br />
            {filename ? `Documento selezionato: ${filename}. ` : "Nessun PDF selezionato. "}La
            scheda sottostante è un esempio, non il contenuto del documento.
          </div>
          <label className="field-label" htmlFor="block-name">
            Nome del blocco
          </label>
          <input
            id="block-name"
            className="field-input mb-6"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="day-selector">
            {days.map((d) => (
              <Button
                key={d}
                variant="ghost"
                className={day === d ? "selected" : ""}
                onClick={() => setDay(d)}
              >
                Giorno {d}
              </Button>
            ))}
          </div>
          <div className="section-heading">
            <h2>{dayNames[day]}</h2>
            <span className="tiny text-muted">{plan[day].length} esercizi</span>
          </div>
          {plan[day].map((e, i) => (
            <section className="edit-exercise" key={e.id}>
              <div className="edit-header">
                <span className="tiny text-muted">ESERCIZIO {i + 1}</span>
                <div className="flex items-center gap-2">
                  <label className="tiny text-muted" htmlFor={`day-${e.id}`}>
                    Giornata
                  </label>
                  <select
                    id={`day-${e.id}`}
                    className="field-input"
                    value={day}
                    onChange={(event) => {
                      const target = event.target.value as Day;
                      setPlan((p) => ({
                        ...p,
                        [day]: p[day].filter((x) => x.id !== e.id),
                        [target]: [...p[target], e],
                      }));
                    }}
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Rimuovi ${e.name}`}
                    onClick={() =>
                      setPlan((p) => ({ ...p, [day]: p[day].filter((x) => x.id !== e.id) }))
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <div className="edit-grid">
                <label>
                  <span className="field-label">Esercizio</span>
                  <input
                    className="field-input"
                    value={e.name}
                    onChange={(event) => edit(e.id, "name", event.target.value)}
                  />
                </label>
                <label>
                  <span className="field-label">Serie</span>
                  <input
                    className="field-input"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={12}
                    value={e.sets}
                    onChange={(event) => edit(e.id, "sets", Number(event.target.value))}
                  />
                </label>
                <label>
                  <span className="field-label">Ripetizioni</span>
                  <input
                    className="field-input"
                    value={e.reps}
                    onChange={(event) => edit(e.id, "reps", event.target.value)}
                  />
                </label>
              </div>
              <label>
                <span className="field-label">Note del coach</span>
                <textarea
                  className="field-input"
                  rows={2}
                  value={e.note}
                  onChange={(event) => edit(e.id, "note", event.target.value)}
                />
              </label>
            </section>
          ))}
          <Button
            className="my-5"
            variant="outline"
            onClick={() =>
              setPlan((p) => ({
                ...p,
                [day]: [
                  ...p[day],
                  {
                    id: crypto.randomUUID(),
                    name: "Nuovo esercizio",
                    sets: 3,
                    reps: "10–12",
                    note: "",
                    muscle: "Personalizzato",
                  },
                ],
              }))
            }
          >
            <Plus />
            Aggiungi esercizio
          </Button>
          <div className="sticky-action">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft />
              Indietro
            </Button>
            <Button disabled={!valid} onClick={() => setConfirm(true)}>
              Attiva blocco
              <Check />
            </Button>
          </div>
          {!valid && (
            <p className="error-message">
              Ogni giornata deve avere almeno un esercizio, nome e ripetizioni. Le serie devono
              essere tra 1 e 12.
            </p>
          )}
        </>
      )}
      {confirm && (
        <ConfirmModal
          title={`Attivare ${name}?`}
          description="Il blocco attuale sarà archiviato con tutti i risultati. Il nuovo blocco inizierà dalla settimana 1, giorno A. La scheda proviene dall’anteprima dimostrativa."
          confirm="Attiva blocco"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            update((s) => {
              if (s.currentSessionId) return s;
              const id = crypto.randomUUID();
              return {
                ...s,
                activeBlockId: id,
                blocks: [
                  ...s.blocks.map((b) => (b.id === s.activeBlockId ? { ...b, archived: true } : b)),
                  { id, name: name.trim(), archived: false, demo: true, plan },
                ],
              };
            });
            void navigate({ to: "/" });
          }}
        />
      )}
    </div>
  );
}
