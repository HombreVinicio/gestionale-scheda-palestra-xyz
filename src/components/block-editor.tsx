import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  assignPendingNote,
  days,
  emptyNotes,
  reorderExercise,
  type Block,
  type Day,
  type Exercise,
  type Notes,
  type NoteTarget,
} from "@/lib/training";

function NoteFields({
  value,
  onChange,
  label,
}: {
  value: Notes;
  onChange: (n: Notes) => void;
  label: string;
}) {
  return (
    <div className="note-fields">
      <label>
        <span className="field-label">Coach</span>
        <textarea
          aria-label={`${label}, coach`}
          className="field-input"
          rows={2}
          value={value.coach}
          onChange={(e) => onChange({ ...value, coach: e.target.value })}
        />
      </label>
      <label>
        <span className="field-label">Personali</span>
        <textarea
          aria-label={`${label}, personali`}
          className="field-input"
          rows={2}
          value={value.personal}
          onChange={(e) => onChange({ ...value, personal: e.target.value })}
        />
      </label>
    </div>
  );
}
function PendingNote({
  block,
  id,
  onChange,
}: {
  block: Block;
  id: string;
  onChange: (b: Block) => void;
}) {
  const note = block.pendingNotes?.find((n) => n.id === id);
  const [target, setTarget] = useState("");
  const [kind, setKind] = useState<keyof Notes>("coach");
  const options: { value: string; label: string; target: NoteTarget }[] = [
    { value: "block", label: "Blocco", target: { level: "block" } },
  ];
  days.forEach((day) => {
    options.push({ value: `day:${day}`, label: `Giorno ${day}`, target: { level: "day", day } });
    block.plan[day].forEach((e) => {
      options.push({
        value: e.id,
        label: `${day} · ${e.name}`,
        target: { level: "exercise", day, exerciseId: e.id },
      });
      for (let i = 0; i < e.sets; i++)
        options.push({
          value: `${e.id}:${i}`,
          label: `${day} · ${e.name} · Serie ${i + 1}`,
          target: { level: "series", day, exerciseId: e.id, series: i },
        });
    });
  });
  if (!note) return null;
  return (
    <div className="pending-note">
      <span className="field-label">{note.source}</span>
      <textarea
        aria-label={`Nota da verificare ${note.source}`}
        className="field-input"
        value={note.text}
        rows={2}
        onChange={(event) =>
          onChange({
            ...block,
            pendingNotes:
              block.pendingNotes?.map((n) =>
                n.id === id ? { ...n, text: event.target.value } : n,
              ) ?? [],
          })
        }
      />
      <div className="pending-actions">
        <select
          className="field-input"
          aria-label={`Associa nota ${note.source}`}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="">Da verificare</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="field-input"
          aria-label={`Tipo nota ${note.source}`}
          value={kind}
          onChange={(e) => setKind(e.target.value === "personal" ? "personal" : "coach")}
        >
          <option value="coach">Coach</option>
          <option value="personal">Personale</option>
        </select>
        <Button
          variant="outline"
          size="icon"
          title="Associa nota"
          aria-label={`Conferma associazione ${note.source}`}
          disabled={!options.some((o) => o.value === target) || !note.text.trim()}
          onClick={() => {
            const selected = options.find((o) => o.value === target);
            if (selected) onChange(assignPendingNote(block, id, selected.target, kind));
          }}
        >
          <Check />
        </Button>
      </div>
    </div>
  );
}
export function BlockEditor({
  block,
  onChange,
}: {
  block: Block;
  onChange: (block: Block) => void;
}) {
  const [day, setDay] = useState<Day>("A");
  const edit = (id: string, patch: Partial<Exercise>) =>
    onChange({
      ...block,
      plan: {
        ...block.plan,
        [day]: block.plan[day].map((e) => (e.id === id ? { ...e, ...patch } : e)),
      },
    });
  return (
    <>
      <label>
        <span className="field-label">Nome del blocco</span>
        <input
          id="block-name"
          className="field-input"
          value={block.name}
          onChange={(e) => onChange({ ...block, name: e.target.value })}
        />
      </label>
      <details className="editor-notes">
        <summary>Note del blocco</summary>
        <NoteFields
          label="Note del blocco"
          value={block.notes ?? emptyNotes()}
          onChange={(notes) => onChange({ ...block, notes })}
        />
      </details>
      <details className="editor-notes" open={Boolean(block.accessories?.length)}>
        <summary>Attività accessorie · senza giornata assegnata</summary>
        {block.accessories?.map((a) => (
          <label key={a.id}>
            <span className="field-label">{a.source}</span>
            <textarea
              className="field-input"
              rows={3}
              aria-label={`Attività accessoria ${a.source}`}
              value={a.text}
              onChange={(event) =>
                onChange({
                  ...block,
                  accessories: block.accessories?.map((x) =>
                    x.id === a.id ? { ...x, text: event.target.value } : x,
                  ),
                })
              }
            />
          </label>
        ))}
      </details>
      {Boolean(block.pendingNotes?.length) && (
        <section className="pending-section">
          <h2>Da verificare · {block.pendingNotes?.length}</h2>
          {block.pendingNotes?.map((n) => (
            <PendingNote key={n.id} block={block} id={n.id} onChange={onChange} />
          ))}
        </section>
      )}
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
        <h2>Giorno {day}</h2>
        <span className="tiny text-muted">{block.plan[day].length} esercizi</span>
      </div>
      <details className="editor-notes">
        <summary>Note della giornata</summary>
        <NoteFields
          label={`Giorno ${day}`}
          value={block.dayNotes?.[day] ?? emptyNotes()}
          onChange={(notes) =>
            onChange({
              ...block,
              dayNotes: {
                ...(block.dayNotes ?? {
                  A: emptyNotes(),
                  B: emptyNotes(),
                  C: emptyNotes(),
                  D: emptyNotes(),
                }),
                [day]: notes,
              },
            })
          }
        />
      </details>
      {block.plan[day].map((e, i) => (
        <section className="edit-exercise" key={e.id}>
          <div className="edit-header">
            <span className="tiny text-muted">ESERCIZIO {i + 1}</span>
            <div className="editor-tools">
              <select
                aria-label={`Giornata di ${e.name}`}
                className="field-input"
                value={day}
                onChange={(event) => {
                  const target = days.find((d) => d === event.target.value);
                  if (!target || target === day) return;
                  onChange({
                    ...block,
                    plan: {
                      ...block.plan,
                      [day]: block.plan[day].filter((x) => x.id !== e.id),
                      [target]: [...block.plan[target], e],
                    },
                  });
                }}
              >
                {days.map((d) => (
                  <option value={d} key={d}>
                    {d}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="icon"
                title="Sposta su"
                aria-label={`Sposta su ${e.name}`}
                disabled={i === 0}
                onClick={() =>
                  onChange({ ...block, plan: reorderExercise(block.plan, day, e.id, -1) })
                }
              >
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Sposta giù"
                aria-label={`Sposta giù ${e.name}`}
                disabled={i === block.plan[day].length - 1}
                onClick={() =>
                  onChange({ ...block, plan: reorderExercise(block.plan, day, e.id, 1) })
                }
              >
                <ArrowDown />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Rimuovi esercizio"
                aria-label={`Rimuovi ${e.name}`}
                onClick={() => {
                  if (
                    window.confirm(
                      `Rimuovere ${e.name} dalla scheda? I risultati storici saranno conservati.`,
                    )
                  )
                    onChange({
                      ...block,
                      plan: { ...block.plan, [day]: block.plan[day].filter((x) => x.id !== e.id) },
                    });
                }}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
          {e.reviewIssues?.length ? (
            <div>
              <p className="error-message">{e.reviewIssues.join(" · ")}</p>
              <Button variant="outline" onClick={() => edit(e.id, { reviewIssues: [] })}>
                Conferma verifica
              </Button>
            </div>
          ) : null}
          {e.importSource && (
            <details className="editor-notes">
              <summary>Testo originale</summary>
              <p className="text-muted tiny">{e.importSource}</p>
            </details>
          )}
          {!e.reps.trim() && <p className="error-message">Ripetizioni mancanti</p>}
          <div className="edit-grid">
            <label>
              <span className="field-label">Esercizio</span>
              <input
                aria-label={`Esercizio ${i + 1}, nome`}
                className="field-input"
                value={e.name}
                onChange={(event) => edit(e.id, { name: event.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Serie</span>
              <input
                aria-label={`${e.name}, serie previste`}
                className="field-input"
                type="number"
                inputMode="numeric"
                min={1}
                max={12}
                value={e.sets}
                onChange={(event) => edit(e.id, { sets: Number(event.target.value) })}
              />
            </label>
            <label>
              <span className="field-label">Ripetizioni</span>
              <input
                aria-label={`${e.name}, ripetizioni previste`}
                className="field-input"
                value={e.reps}
                onChange={(event) =>
                  edit(e.id, {
                    reps: event.target.value,
                    seriesTargets: e.seriesTargets?.map((t) => ({
                      ...t,
                      reps: event.target.value,
                    })),
                  })
                }
              />
            </label>
          </div>
          <details className="editor-notes">
            <summary>Note esercizio e serie</summary>
            <NoteFields
              label={e.name}
              value={{ coach: e.note, personal: e.personalNote ?? "" }}
              onChange={(n) => edit(e.id, { note: n.coach, personalNote: n.personal })}
            />
            {Array.from({ length: Math.min(12, Math.max(0, e.sets)) }, (_, j) => (
              <div className="series-note-editor" key={j}>
                <h3>Serie {j + 1}</h3>
                {e.seriesTargets && (
                  <div className="note-fields">
                    <label>
                      <span className="field-label">Ruolo</span>
                      <input
                        className="field-input"
                        aria-label={`${e.name}, serie ${j + 1}, ruolo`}
                        value={e.seriesTargets[j]?.role ?? ""}
                        onChange={(event) => {
                          const targets = Array.from(
                            { length: e.sets },
                            (_, k) => e.seriesTargets?.[k] ?? { role: "", reps: e.reps },
                          );
                          targets[j] = { reps: targets[j]?.reps ?? "", role: event.target.value };
                          edit(e.id, { seriesTargets: targets });
                        }}
                      />
                    </label>
                    <label>
                      <span className="field-label">Ripetizioni previste</span>
                      <input
                        className="field-input"
                        aria-label={`${e.name}, serie ${j + 1}, ripetizioni previste`}
                        value={e.seriesTargets[j]?.reps ?? ""}
                        onChange={(event) => {
                          const targets = Array.from(
                            { length: e.sets },
                            (_, k) => e.seriesTargets?.[k] ?? { role: "", reps: e.reps },
                          );
                          targets[j] = { role: targets[j]?.role ?? "", reps: event.target.value };
                          edit(e.id, {
                            seriesTargets: targets,
                            reps: targets.map((t) => t.reps).join(" + "),
                          });
                        }}
                      />
                    </label>
                  </div>
                )}
                <NoteFields
                  label={`${e.name}, serie ${j + 1}`}
                  value={e.seriesNotes?.[j] ?? emptyNotes()}
                  onChange={(n) => {
                    const notes = [...(e.seriesNotes ?? [])];
                    while (notes.length <= j) notes.push(emptyNotes());
                    notes[j] = n;
                    edit(e.id, { seriesNotes: notes });
                  }}
                />
              </div>
            ))}
          </details>
        </section>
      ))}
      <Button
        className="my-5"
        variant="outline"
        onClick={() =>
          onChange({
            ...block,
            plan: {
              ...block.plan,
              [day]: [
                ...block.plan[day],
                {
                  id: crypto.randomUUID(),
                  name: "Nuovo esercizio",
                  sets: 3,
                  reps: "10–12",
                  note: "",
                  muscle: "",
                  personalNote: "",
                  seriesNotes: [],
                },
              ],
            },
          })
        }
      >
        <Plus />
        Aggiungi esercizio
      </Button>
    </>
  );
}
export function validBlock(block: Block) {
  return (
    Boolean(block.name.trim()) &&
    days.every(
      (d) =>
        block.plan[d].length > 0 &&
        block.plan[d].every(
          (e) =>
            e.name.trim() &&
            e.reps.trim() &&
            Number.isInteger(e.sets) &&
            e.sets >= 1 &&
            e.sets <= 12,
        ),
    )
  );
}
