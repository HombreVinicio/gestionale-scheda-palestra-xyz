import { describe, expect, it } from "vitest";
import {
  beginSession,
  closeSession,
  cursor,
  initialState,
  parseBackup,
  reopenSession,
  type Day,
  type TrainingState,
} from "@/lib/training";
function empty(): TrainingState {
  return { ...initialState(), sessions: [] };
}
function complete(s: TrainingState, day: Day) {
  const started = beginSession(s, day);
  return closeSession(started, started.currentSessionId ?? "missing");
}
describe("Regole allenamenti", () => {
  it("inizia dalla settimana 1, giorno A", () => {
    expect(cursor(empty(), "demo-block-1")).toEqual({ day: "A", week: 1 });
  });
  it.each([
    ["A", "B"],
    ["B", "C"],
    ["C", "D"],
  ] as const)("dopo %s propone %s senza cambiare settimana", (day, next) => {
    expect(cursor(complete(empty(), day), "demo-block-1")).toEqual({ day: next, week: 1 });
  });
  it("dopo D passa ad A della settimana successiva", () => {
    expect(
      cursor(complete(complete(complete(complete(empty(), "A"), "B"), "C"), "D"), "demo-block-1"),
    ).toEqual({ day: "A", week: 2 });
  });
  it("un doppio tocco su chiusura non avanza due volte", () => {
    const started = beginSession(empty(), "D");
    const closed = closeSession(started, started.currentSessionId ?? "missing");
    expect(closeSession(closed, started.currentSessionId ?? "missing")).toBe(closed);
    expect(cursor(closed, "demo-block-1")).toEqual({ day: "A", week: 1 });
  });
  it("un doppio inizio mantiene una sola sessione", () => {
    const s = beginSession(empty(), "A");
    expect(beginSession(s, "B")).toBe(s);
    expect(s.sessions).toHaveLength(1);
  });
  it("una giornata scelta manualmente determina la proposta successiva", () => {
    expect(cursor(complete(empty(), "C"), "demo-block-1").day).toBe("D");
  });
  it("riaprire l’ultima sessione ripristina la posizione precedente", () => {
    const b = complete(complete(empty(), "A"), "B");
    const last = b.sessions.at(-1);
    if (!last) throw new Error("Sessione mancante");
    const reopened = reopenSession(b, last.id);
    expect(cursor(reopened, "demo-block-1")).toEqual({ day: "B", week: 1 });
    expect(reopened.currentSessionId).toBe(last.id);
  });
  it("riaprire una sessione precedente non annulla quelle successive", () => {
    const b = complete(complete(empty(), "A"), "B");
    const first = b.sessions[0];
    if (!first) throw new Error("Sessione mancante");
    const reopened = reopenSession(b, first.id);
    expect(cursor(reopened, "demo-block-1")).toEqual({ day: "C", week: 1 });
    expect(cursor(closeSession(reopened, first.id), "demo-block-1")).toEqual({ day: "C", week: 1 });
  });
  it("il backup conserva sessione incompleta e valori separati", () => {
    const s = beginSession(empty(), "A");
    const session = s.sessions[0];
    if (!session) throw new Error("Sessione mancante");
    session.results["a1"] = [{ weight: "62.5", reps: "9", done: true }];
    const restored = parseBackup(JSON.stringify(s));
    expect(restored.currentSessionId).toBe(s.currentSessionId);
    expect(restored.sessions[0]?.results["a1"]?.[0]).toEqual({
      weight: "62.5",
      reps: "9",
      done: true,
    });
    expect(restored.blocks[0]?.plan.A[0]?.reps).toBe("8–10");
  });
  it("non riapre una sessione di un blocco archiviato", () => {
    const s = complete(empty(), "A");
    const archived = { ...s, activeBlockId: null };
    expect(reopenSession(archived, s.sessions[0]?.id ?? "missing")).toBe(archived);
  });
  it("il nuovo blocco inizia dalla settimana 1, giorno A senza eliminare lo storico", () => {
    const s = initialState();
    const b = s.blocks[0];
    if (!b) throw new Error("Blocco mancante");
    const added = {
      ...s,
      blocks: [...s.blocks, { ...b, id: "new-block" }],
      activeBlockId: "new-block",
    };
    expect(cursor(added, "new-block")).toEqual({ day: "A", week: 1 });
    expect(added.sessions).toHaveLength(5);
  });
  it("rifiuta un backup con riferimenti non validi", () => {
    expect(() =>
      parseBackup(JSON.stringify({ ...initialState(), currentSessionId: "unknown" })),
    ).toThrow();
  });
  it("i risultati personali non sono etichettati come dimostrativi", () => {
    const s = beginSession(initialState(), "B");
    expect(s.sessions.at(-1)?.demo).toBe(false);
    expect(s.sessions.filter((x) => x.demo)).toHaveLength(5);
  });
});
