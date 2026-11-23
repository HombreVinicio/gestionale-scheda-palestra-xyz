import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link2, ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DayCountEditor } from "@/components/day-count-editor";
import {
  changeExerciseSeries,
  exerciseSeriesTargets,
  resizeExerciseSeries,
  setExerciseRepetitions,
  validExercisePrescription,
} from "@/lib/prescription";
import {
  days,
  blockDays,
  supersetClass,
  emptyNotes,
  reorderExercise,
  type Block,
  type Day,
  type Exercise,
  type Notes,
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
  if (!note) return null;
  return (
    <div className="pending-note">
      <span className="field-label">{note.source}</span>
      <textarea
        aria-label={`Testo non riconosciuto ${note.source}`}
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
      <Button
        variant="outline"
        onClick={() =>
          onChange({ ...block, pendingNotes: block.pendingNotes?.filter((n) => n.id !== id) ?? [] })
        }
      >
        <Trash2 />
        Elimina
      </Button>
    </div>
  );
}
export function BlockEditor({
  block,
  onChange,
  fixedActions,
}: {
  block: Block;
  onChange: (block: Block) => void;
  fixedActions?: ReactNode;
}) {
  const [chosenDay, setDay] = useState<Day>("A");
  const order = blockDays(block);
  const day = order.includes(chosenDay) ? chosenDay : (order[0] ?? "A");
  const position = useRef<number | null>(null);
  const change = (next: Block) => {
    position.current = window.scrollY;
    onChange(next);
  };
  useLayoutEffect(() => {
    if (position.current !== null) {
      window.scrollTo({ top: position.current, behavior: "instant" });
      position.current = null;
    }
  }, [block]);
  const add = () =>
    change({
      ...block,
      plan: {
        ...block.plan,
        [day]: [
          ...(block.plan[day] ?? []),
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
    });
  const edit = (id: string, patch: Partial<Exercise>) =>
    change({
      ...block,
      plan: {
        ...block.plan,
        [day]: (block.plan[day] ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)),
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
          onChange={(e) => change({ ...block, name: e.target.value })}
        />
      </label>
      <DayCountEditor block={block} onChange={change} />
      <details className="editor-notes">
        <summary>Note del blocco</summary>
        <NoteFields
          label="Note del blocco"
          value={block.notes ?? emptyNotes()}
          onChange={(notes) => change({ ...block, notes })}
        />
      </details>
      {Boolean(block.accessories?.length) && (
        <details className="editor-notes" open>
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
                  change({
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
      )}
      {Boolean(block.pendingNotes?.length) && (
        <section className="pending-section">
          <h2>Testo non riconosciuto · {block.pendingNotes?.length}</h2>
          {block.pendingNotes?.map((n) => (
            <PendingNote key={n.id} block={block} id={n.id} onChange={change} />
          ))}
        </section>
      )}
      <div className={fixedActions ? "import-dock" : undefined}>
        <div className="day-selector" aria-label="Giornate di allenamento">
          {order.map((d) => (
            <Button
              key={d}
              variant="ghost"
              className={day === d ? "selected" : ""}
              aria-pressed={day === d}
              onClick={() => setDay(d)}
            >
              Giorno {d}
            </Button>
          ))}
        </div>
        {fixedActions}
      </div>
      <div className="section-heading">
        <h2>Giorno {day}</h2>
        <Button variant="outline" onClick={add}>
          <Plus />
          Aggiungi esercizio
        </Button>
      </div>
      <details className="editor-notes">
        <summary>Note della giornata</summary>
        <NoteFields
          label={`Giorno ${day}`}
          value={block.dayNotes?.[day] ?? emptyNotes()}
          onChange={(notes) =>
            change({
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
      {(block.plan[day] ?? []).map((e, i) => {
        const targets = exerciseSeriesTargets(e);
        const commonReps = targets.every((t) => t.reps === targets[0]?.reps)
          ? (targets[0]?.reps ?? "")
          : "";
        return (
          <section
            className={`edit-exercise ${supersetClass(block.plan[day] ?? [], i)}`}
            key={e.id}
          >
            <div className="edit-header">
              <span className="exercise-day-label">
                Giorno {day} · {i + 1}
              </span>
              <div className="editor-tools">
                <select
                  aria-label={`Giornata di ${e.name}`}
                  className="field-input"
                  value={day}
                  onChange={(event) => {
                    const target = order.find((d) => d === event.target.value);
                    if (!target || target === day) return;
                    change({
                      ...block,
                      plan: {
                        ...block.plan,
                        [day]: (block.plan[day] ?? []).filter((x) => x.id !== e.id),
                        [target]: [...(block.plan[target] ?? []), e],
                      },
                    });
                  }}
                >
                  {order.map((d) => (
                    <option value={d} key={d}>
                      Giorno {d}
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
                    change({ ...block, plan: reorderExercise(block.plan, day, e.id, -1) })
                  }
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Sposta giù"
                  aria-label={`Sposta giù ${e.name}`}
                  disabled={i === (block.plan[day] ?? []).length - 1}
                  onClick={() =>
                    change({ ...block, plan: reorderExercise(block.plan, day, e.id, 1) })
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
                      change({
                        ...block,
                        plan: {
                          ...block.plan,
                          [day]: (block.plan[day] ?? []).filter((x) => x.id !== e.id),
                        },
                      });
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
            {i < (block.plan[day]?.length ?? 0) - 1 && (
              <Button
                variant={e.supersetNext ? "default" : "outline"}
                size="sm"
                aria-pressed={Boolean(e.supersetNext)}
                onClick={() => edit(e.id, { supersetNext: !e.supersetNext })}
              >
                <Link2 />
                {e.supersetNext ? "Super serie con il successivo" : "Collega al successivo"}
              </Button>
            )}
            {e.reviewIssues?.length ? (
              <div>
                <p className="error-message">{e.reviewIssues.join(" · ")}</p>
                <Button
                  variant="outline"
                  onClick={() =>
                    change({
                      ...block,
                      plan: {
                        ...block.plan,
                        [day]: (block.plan[day] ?? []).filter((x) => x.id !== e.id),
                      },
                    })
                  }
                >
                  <Trash2 />
                  Elimina esercizio
                </Button>
              </div>
            ) : null}
            {e.importSource && (
              <details className="editor-notes">
                <summary>Testo originale</summary>
                <p className="text-muted tiny">{e.importSource}</p>
              </details>
            )}
            {!validExercisePrescription(e) && (
              <p className="error-message">Completa le ripetizioni di ogni serie</p>
            )}
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
                  onChange={(event) =>
                    edit(e.id, resizeExerciseSeries(e, Number(event.target.value)))
                  }
                />
              </label>
              <label>
                <span className="field-label">Ripetizioni per tutte le serie</span>
                <input
                  aria-label={`${e.name}, ripetizioni previste`}
                  className="field-input"
                  value={commonReps}
                  placeholder={commonReps ? undefined : "Diverse per serie"}
                  onChange={(event) => edit(e.id, setExerciseRepetitions(e, event.target.value))}
                />
              </label>
            </div>
            <details className="editor-notes">
              <summary>Note esercizio</summary>
              <NoteFields
                label={e.name}
                value={{ coach: e.note, personal: e.personalNote ?? "" }}
                onChange={(n) => edit(e.id, { note: n.coach, personalNote: n.personal })}
              />
            </details>
            {targets.map((target, j) => (
              <div className="series-note-editor" key={j}>
                <h3>Serie {j + 1}</h3>
                <div className="note-fields">
                  <label>
                    <span className="field-label">Ruolo</span>
                    <input
                      className="field-input"
                      aria-label={`${e.name}, serie ${j + 1}, ruolo`}
                      value={target.role}
                      onChange={(event) =>
                        edit(e.id, changeExerciseSeries(e, j, { role: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    <span className="field-label">Ripetizioni previste</span>
                    <input
                      className="field-input"
                      aria-label={`${e.name}, serie ${j + 1}, ripetizioni previste`}
                      value={target.reps}
                      onChange={(event) =>
                        edit(e.id, changeExerciseSeries(e, j, { reps: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <details className="editor-notes">
                  <summary>Note serie {j + 1}</summary>
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
                </details>
              </div>
            ))}
          </section>
        );
      })}
      <Button className="my-5" variant="outline" onClick={add}>
        <Plus />
        Aggiungi esercizio
      </Button>
    </>
  );
}
export function validBlock(block: Block) {
  return (
    Boolean(block.name.trim()) &&
    blockDays(block).every(
      (d) =>
        (block.plan[d] ?? []).length > 0 &&
        (block.plan[d] ?? []).every((e) => e.name.trim() && validExercisePrescription(e)),
    )
  );
}
