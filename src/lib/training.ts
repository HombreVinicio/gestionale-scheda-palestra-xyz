import { z } from "zod";

export const days = ["A", "B", "C", "D"] as const;
export type Day = (typeof days)[number];
export const notesSchema = z.object({ coach: z.string(), personal: z.string() });
export type Notes = z.infer<typeof notesSchema>;
export const emptyNotes = (): Notes => ({ coach: "", personal: "" });
const pendingNoteSchema = z.object({ id: z.string(), text: z.string(), source: z.string() });
const exerciseSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  sets: z.number().int().min(1).max(12),
  reps: z.string().min(1),
  note: z.string(),
  muscle: z.string(),
  personalNote: z.string().optional(),
  seriesNotes: z.array(notesSchema).optional(),
});
const blockSchema = z.object({
  id: z.string(),
  name: z.string(),
  archived: z.boolean(),
  demo: z.boolean(),
  notes: notesSchema.optional(),
  dayNotes: z.object({ A: notesSchema, B: notesSchema, C: notesSchema, D: notesSchema }).optional(),
  pendingNotes: z.array(pendingNoteSchema).optional(),
  plan: z.object({
    A: z.array(exerciseSchema),
    B: z.array(exerciseSchema),
    C: z.array(exerciseSchema),
    D: z.array(exerciseSchema),
  }),
});
const setSchema = z.object({
  weight: z.string().refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0)),
  reps: z.string().refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0)),
  done: z.boolean(),
});
const sessionSchema = z.object({
  id: z.string(),
  blockId: z.string(),
  day: z.enum(days),
  week: z.number().int().min(1),
  order: z.number().int().min(0),
  startedAt: z.string(),
  closedAt: z.string().nullable(),
  demo: z.boolean(),
  results: z.record(z.array(setSchema)),
  snapshot: z
    .object({
      blockName: z.string(),
      blockNotes: notesSchema,
      dayNotes: notesSchema,
      exercises: z.array(exerciseSchema),
    })
    .optional(),
});
export const stateSchema = z
  .object({
    version: z.literal(1),
    blocks: z.array(blockSchema).min(1),
    activeBlockId: z.string().nullable(),
    sessions: z.array(sessionSchema),
    currentSessionId: z.string().nullable(),
    editorDraft: z
      .object({
        mode: z.enum(["new", "edit"]),
        block: blockSchema,
        source: z.string(),
        imported: z.boolean(),
      })
      .optional(),
  })
  .superRefine((s, ctx) => {
    const ids = s.blocks.map((b) => b.id);
    if (
      new Set(ids).size !== ids.length ||
      new Set(s.sessions.map((x) => x.id)).size !== s.sessions.length
    )
      ctx.addIssue({ code: "custom", message: "Identificativi duplicati" });
    if (s.activeBlockId && !s.blocks.some((b) => b.id === s.activeBlockId && !b.archived))
      ctx.addIssue({ code: "custom", message: "Blocco attivo non valido" });
    if (s.sessions.some((x) => !ids.includes(x.blockId)))
      ctx.addIssue({ code: "custom", message: "Sessione senza blocco" });
    if (
      s.currentSessionId &&
      !s.sessions.some(
        (x) => x.id === s.currentSessionId && !x.closedAt && x.blockId === s.activeBlockId,
      )
    )
      ctx.addIssue({ code: "custom", message: "Sessione corrente non valida" });
  });
export type Exercise = z.infer<typeof exerciseSchema>;
export type Block = z.infer<typeof blockSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type TrainingState = z.infer<typeof stateSchema>;
export const storageKey = "serie-training-v1";
export const dayNames: Record<Day, string> = {
  A: "Petto e tricipiti",
  B: "Dorso e bicipiti",
  C: "Gambe e addome",
  D: "Spalle e richiami",
};

export function demoPlan(): Block["plan"] {
  const ex = (id: string, name: string, sets: number, reps: string, muscle: string, note = "") => ({
    id,
    name,
    sets,
    reps,
    muscle,
    note,
  });
  return {
    A: [
      ex(
        "a1",
        "Panca piana con bilanciere",
        4,
        "8–10",
        "Petto",
        "Controlla la discesa. Recupero 90 secondi.",
      ),
      ex("a2", "Panca inclinata con manubri", 3, "10–12", "Petto"),
      ex("a3", "Croci ai cavi", 3, "12–15", "Petto"),
      ex("a4", "Push down al cavo", 3, "10–12", "Tricipiti"),
      ex("a5", "French press con manubri", 3, "12", "Tricipiti"),
    ],
    B: [
      ex(
        "b1",
        "Lat machine presa larga",
        4,
        "8–10",
        "Dorso",
        "Porta i gomiti verso il basso, senza slanci. Recupero 90 secondi.",
      ),
      ex("b2", "Rematore con bilanciere", 3, "8–10", "Dorso", "Mantieni la schiena neutra."),
      ex("b3", "Pulley basso", 3, "10–12", "Dorso"),
      ex("b4", "Curl con bilanciere", 3, "10–12", "Bicipiti"),
      ex("b5", "Curl a martello", 3, "12–15", "Bicipiti"),
    ],
    C: [
      ex(
        "c1",
        "Squat con bilanciere",
        4,
        "6–8",
        "Gambe",
        "Scendi in controllo. Recupero 120 secondi.",
      ),
      ex("c2", "Leg press", 3, "10–12", "Gambe"),
      ex("c3", "Leg curl", 3, "12–15", "Gambe"),
      ex("c4", "Calf raise", 3, "15–20", "Polpacci"),
      ex("c5", "Crunch al cavo", 3, "15", "Addome"),
    ],
    D: [
      ex(
        "d1",
        "Military press",
        4,
        "8–10",
        "Spalle",
        "Addome contratto, evita di inarcare la schiena.",
      ),
      ex("d2", "Alzate laterali", 3, "12–15", "Spalle"),
      ex("d3", "Face pull", 3, "12–15", "Spalle"),
      ex("d4", "Panca piana con manubri", 3, "10–12", "Petto"),
      ex("d5", "Pulldown al cavo", 3, "12", "Dorso"),
    ],
  };
}

export function initialState(): TrainingState {
  const plan = demoPlan();
  const block: Block = { id: "demo-block-1", name: "Blocco 1", archived: false, demo: true, plan };
  const sessions: Session[] = (["A", "B", "C", "D", "A"] as Day[]).map((day, i) => ({
    id: `demo-session-${i}`,
    blockId: block.id,
    day,
    week: i < 4 ? 1 : 2,
    order: i,
    startedAt: `2026-11-${String(3 + i * 2).padStart(2, "0")}T17:00:00Z`,
    closedAt: `2026-11-${String(3 + i * 2).padStart(2, "0")}T17:52:00Z`,
    demo: true,
    results: Object.fromEntries(
      plan[day].map((e, j) => [
        e.id,
        Array.from({ length: e.sets }, (_, k) => ({
          weight: String([55, 40, 35, 20, 12][j] ?? 20),
          reps: String(10 - (k > 1 ? 1 : 0)),
          done: true,
        })),
      ]),
    ),
  }));
  return { version: 1, blocks: [block], activeBlockId: block.id, sessions, currentSessionId: null };
}

export function cursor(state: TrainingState, blockId: string): { day: Day; week: number } {
  const latest = state.sessions
    .filter((s) => s.blockId === blockId && s.closedAt)
    .sort((a, b) => b.order - a.order)[0];
  if (!latest) return { day: "A", week: 1 };
  const index = days.indexOf(latest.day);
  return { day: days[(index + 1) % 4] ?? "A", week: latest.week + (latest.day === "D" ? 1 : 0) };
}

export function beginSession(state: TrainingState, day: Day): TrainingState {
  if (state.currentSessionId || !state.activeBlockId) return state;
  const block = state.blocks.find((b) => b.id === state.activeBlockId && !b.archived);
  if (!block) return state;
  const position = cursor(state, block.id);
  const session: Session = {
    id: crypto.randomUUID(),
    blockId: block.id,
    day,
    week: position.week,
    order: Math.max(-1, ...state.sessions.map((s) => s.order)) + 1,
    startedAt: new Date().toISOString(),
    closedAt: null,
    demo: false,
    snapshot: makeSnapshot(block, day),
    results: Object.fromEntries(
      block.plan[day].map((e) => [
        e.id,
        Array.from({ length: e.sets }, () => ({ weight: "", reps: "", done: false })),
      ]),
    ),
  };
  return { ...state, sessions: [...state.sessions, session], currentSessionId: session.id };
}

export function closeSession(state: TrainingState, id: string): TrainingState {
  const session = state.sessions.find((s) => s.id === id);
  if (!session || session.closedAt || state.currentSessionId !== id) return state;
  return {
    ...state,
    currentSessionId: null,
    sessions: state.sessions.map((s) =>
      s.id === id ? { ...s, closedAt: new Date().toISOString() } : s,
    ),
  };
}

export function reopenSession(state: TrainingState, id: string): TrainingState {
  const session = state.sessions.find((s) => s.id === id);
  if (
    !session ||
    !session.closedAt ||
    state.currentSessionId ||
    session.blockId !== state.activeBlockId
  )
    return state;
  return {
    ...state,
    currentSessionId: id,
    sessions: state.sessions.map((s) => (s.id === id ? { ...s, closedAt: null } : s)),
  };
}

export function previousCompletedSession(
  state: TrainingState,
  session: Session,
): Session | undefined {
  return state.sessions
    .filter(
      (candidate) =>
        candidate.id !== session.id &&
        candidate.blockId === session.blockId &&
        candidate.day === session.day &&
        candidate.closedAt !== null &&
        candidate.order < session.order,
    )
    .sort((a, b) => b.order - a.order)[0];
}

export function parseBackup(text: string): TrainingState {
  return migrateState(stateSchema.parse(JSON.parse(text)));
}
export function makeSnapshot(block: Block, day: Day) {
  return structuredClone({
    blockName: block.name,
    blockNotes: block.notes ?? emptyNotes(),
    dayNotes: block.dayNotes?.[day] ?? emptyNotes(),
    exercises: block.plan[day],
  });
}
export function sessionSnapshot(session: Session, block: Block) {
  return session.snapshot ?? makeSnapshot(block, session.day);
}
export function migrateState(state: TrainingState): TrainingState {
  return {
    ...state,
    sessions: state.sessions.map((s) => {
      const block = state.blocks.find((b) => b.id === s.blockId);
      return s.snapshot || !block ? s : { ...s, snapshot: makeSnapshot(block, s.day) };
    }),
  };
}
export function saveBlock(state: TrainingState, block: Block): TrainingState {
  const previous = state.blocks.find((b) => b.id === block.id);
  if (!previous || previous.archived) return state;
  // Capture legacy sessions before touching the plan, including any open session.
  const migrated = migrateState(state);
  const { editorDraft: _draft, ...rest } = migrated;
  return {
    ...rest,
    blocks: migrated.blocks.map((b) => (b.id === block.id ? structuredClone(block) : b)),
  };
}
export function reorderExercise(
  plan: Block["plan"],
  day: Day,
  id: string,
  direction: -1 | 1,
): Block["plan"] {
  const list = [...plan[day]];
  const index = list.findIndex((e) => e.id === id);
  const target = index + direction;
  const exercise = list[index];
  const other = list[target];
  if (!exercise || !other) return plan;
  list[index] = other;
  list[target] = exercise;
  return { ...plan, [day]: list };
}
export type NoteTarget =
  | { level: "block" }
  | { level: "day"; day: Day }
  | { level: "exercise"; day: Day; exerciseId: string }
  | { level: "series"; day: Day; exerciseId: string; series: number };
export function assignPendingNote(
  block: Block,
  id: string,
  target: NoteTarget,
  kind: keyof Notes,
): Block {
  const pending = block.pendingNotes?.find((n) => n.id === id);
  if (!pending) return block;
  const append = (notes: Notes) => ({
    ...notes,
    [kind]: [notes[kind], pending.text].filter(Boolean).join("\n"),
  });
  let next = structuredClone(block);
  if (target.level === "block") next.notes = append(next.notes ?? emptyNotes());
  else if (target.level === "day") {
    const map = next.dayNotes ?? {
      A: emptyNotes(),
      B: emptyNotes(),
      C: emptyNotes(),
      D: emptyNotes(),
    };
    next.dayNotes = { ...map, [target.day]: append(map[target.day]) };
  } else {
    const exercise = next.plan[target.day].find((e) => e.id === target.exerciseId);
    if (
      !exercise ||
      (target.level === "series" && (target.series < 0 || target.series >= exercise.sets))
    )
      return block;
    if (target.level === "exercise") {
      if (kind === "coach")
        exercise.note = [exercise.note, pending.text].filter(Boolean).join("\n");
      else exercise.personalNote = [exercise.personalNote, pending.text].filter(Boolean).join("\n");
    } else {
      const list = Array.from(
        { length: exercise.sets },
        (_, i) => exercise.seriesNotes?.[i] ?? emptyNotes(),
      );
      list[target.series] = append(list[target.series] ?? emptyNotes());
      exercise.seriesNotes = list;
    }
  }
  next.pendingNotes = next.pendingNotes?.filter((n) => n.id !== id) ?? [];
  return next;
}
export function volume(session: Session) {
  return Object.values(session.results)
    .flat()
    .filter((s) => s.done)
    .reduce((sum, s) => sum + Number(s.weight) * Number(s.reps), 0);
}
export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}
