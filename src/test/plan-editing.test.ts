import { describe, expect, it } from "vitest";
import {
  assignPendingNote,
  beginSession,
  closeSession,
  emptyNotes,
  initialState,
  parseBackup,
  reorderExercise,
  saveBlock,
  sessionSnapshot,
} from "@/lib/training";
import { planFromLines } from "@/lib/pdf-plan";
function noted() {
  const s = initialState();
  const b = s.blocks[0];
  if (!b) throw new Error();
  b.notes = { coach: "Recupero", personal: "Cintura" };
  b.dayNotes = {
    A: { coach: "Addome a fine seduta", personal: "Mattina" },
    B: emptyNotes(),
    C: emptyNotes(),
    D: emptyNotes(),
  };
  const e = b.plan.A[0];
  if (!e) throw new Error();
  e.seriesNotes = [
    { coach: "Buffer 1", personal: "" },
    { coach: "Buffer 0", personal: "" },
  ];
  e.personalNote = "Presa comoda";
  return s;
}
describe("Schede e indicazioni", () => {
  it("conserva Buffer 1 e Buffer 0 nella serie corretta", () => {
    const s = beginSession(noted(), "A");
    expect(s.sessions.at(-1)?.snapshot?.exercises[0]?.seriesNotes).toEqual([
      { coach: "Buffer 1", personal: "" },
      { coach: "Buffer 0", personal: "" },
    ]);
  });
  it("conserva note di blocco, giornata, esercizio e serie nel backup", () => {
    const restored = parseBackup(JSON.stringify(beginSession(noted(), "A")));
    const x = restored.sessions.at(-1)?.snapshot;
    expect(x?.blockNotes.personal).toBe("Cintura");
    expect(x?.dayNotes.coach).toBe("Addome a fine seduta");
    expect(x?.exercises[0]?.personalNote).toBe("Presa comoda");
    expect(x?.exercises[0]?.seriesNotes?.[1]?.coach).toBe("Buffer 0");
  });
  it("modifiche e cancellazioni non alterano una sessione chiusa", () => {
    const started = beginSession(noted(), "A");
    const session = started.sessions.at(-1);
    if (!session) throw new Error();
    session.results["a1"] = [{ weight: "70", reps: "8", done: true }];
    const closed = closeSession(started, session.id);
    const b = structuredClone(closed.blocks[0]);
    if (!b) throw new Error();
    b.name = "Nuovo nome";
    b.plan.A = b.plan.A.filter((e) => e.id !== "a1");
    const edited = saveBlock(closed, b);
    const old = edited.sessions.find((s) => s.id === session.id);
    if (!old) throw new Error();
    expect(sessionSnapshot(old, b).exercises[0]?.name).toBe("Panca piana con bilanciere");
    expect(old.results["a1"]?.[0]?.weight).toBe("70");
    expect(old.snapshot?.exercises[0]?.seriesNotes?.[1]?.coach).toBe("Buffer 0");
  });
  it("la sessione in corso conserva la scheda e la successiva usa le modifiche", () => {
    const s = beginSession(noted(), "A");
    const b = structuredClone(s.blocks[0]);
    if (!b) throw new Error();
    b.plan.A[0] = {
      ...b.plan.A[0],
      id: "replacement",
      name: "Nuovo esercizio",
      sets: 2,
      reps: "15",
      note: "",
      muscle: "",
    };
    const edited = saveBlock(s, b);
    expect(edited.sessions.at(-1)?.snapshot?.exercises[0]?.name).toBe("Panca piana con bilanciere");
    const next = beginSession(closeSession(edited, edited.currentSessionId ?? ""), "A");
    expect(next.sessions.at(-1)?.snapshot?.exercises[0]?.name).toBe("Nuovo esercizio");
    expect(next.sessions.at(-1)?.results["replacement"]).toHaveLength(2);
  });
  it("migra dati precedenti senza perdere valori prima di modificare", () => {
    const old = noted();
    const b = old.blocks[0];
    if (!b) throw new Error();
    const edited = saveBlock(old, { ...b, plan: { ...b.plan, A: [] } });
    expect(edited.sessions[0]?.snapshot?.exercises[0]?.name).toBe("Panca piana con bilanciere");
    expect(edited.sessions[0]?.results["a1"]?.[0]?.weight).toBe("55");
  });
  it("riordina senza cambiare identificativi o note", () => {
    const s = noted();
    const b = s.blocks[0];
    if (!b) throw new Error();
    const plan = reorderExercise(b.plan, "A", "a1", 1);
    expect(plan.A[1]?.id).toBe("a1");
    expect(plan.A[1]?.seriesNotes?.[0]?.coach).toBe("Buffer 1");
    expect(b.plan.A[0]?.id).toBe("a1");
  });
  it("un blocco archiviato conserva note e non è modificabile", () => {
    const s = noted();
    const b = s.blocks[0];
    if (!b) throw new Error();
    b.archived = true;
    expect(saveBlock(s, { ...b, name: "Diverso" })).toBe(s);
    expect(parseBackup(JSON.stringify({ ...s, activeBlockId: null })).blocks[0]?.notes?.coach).toBe(
      "Recupero",
    );
  });
  it("non importa righe senza geometria di tabella né indicazioni esterne", () => {
    const b = planFromLines(
      [
        { page: 1, text: "Giorno A" },
        { page: 1, text: "Panca piana 2 x 8–10" },
        { page: 1, text: "Serie 1: Buffer 1" },
        { page: 1, text: "Addome: 3 esercizi a fine seduta" },
      ],
      "PDF",
    );
    expect(b.plan.A).toEqual([]);
    expect(b.pendingNotes).toEqual([]);
    expect(b.accessories).toEqual([]);
    expect(b.notes?.coach).toBe("");
  });
  it.each(["block", "day", "exercise", "series"] as const)(
    "associa manualmente una nota a %s",
    (level) => {
      const s = noted();
      const b = s.blocks[0];
      if (!b) throw new Error();
      b.pendingNotes = [{ id: "pending", text: "Indicazione verificata", source: "Pagina 2" }];
      const target =
        level === "block"
          ? { level }
          : level === "day"
            ? { level, day: "A" as const }
            : level === "exercise"
              ? { level, day: "A" as const, exerciseId: "a1" }
              : { level, day: "A" as const, exerciseId: "a1", series: 1 };
      const next = assignPendingNote(b, "pending", target, "coach");
      expect(next.pendingNotes).toEqual([]);
      const text =
        level === "block"
          ? next.notes?.coach
          : level === "day"
            ? next.dayNotes?.A.coach
            : level === "exercise"
              ? next.plan.A[0]?.note
              : next.plan.A[0]?.seriesNotes?.[1]?.coach;
      expect(text).toContain("Indicazione verificata");
    },
  );
  it("conserva note non associate e la bozza al ripristino", () => {
    const s = noted();
    const b = s.blocks[0];
    if (!b) throw new Error();
    b.pendingNotes = [{ id: "p", text: "Verificare addome", source: "Pagina 3" }];
    const restored = parseBackup(
      JSON.stringify({
        ...s,
        editorDraft: { mode: "edit", block: b, source: "", imported: false },
      }),
    );
    expect(restored.editorDraft?.block.pendingNotes?.[0]?.text).toBe("Verificare addome");
  });
});
