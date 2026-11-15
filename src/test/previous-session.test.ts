import { describe, expect, it } from "vitest";
import {
  beginSession,
  closeSession,
  cursor,
  emptyNotes,
  initialState,
  parseBackup,
  previousCompletedSession,
  reorderExercise,
  saveBlock,
  type Day,
  type Session,
  type TrainingState,
} from "@/lib/training";

function current(state: TrainingState): Session {
  const session = state.sessions.find((s) => s.id === state.currentSessionId);
  if (!session) throw new Error("Sessione mancante");
  return session;
}
function completed(state: TrainingState, day: Day): TrainingState {
  const started = beginSession(state, day);
  return closeSession(started, current(started).id);
}
function completedB(): TrainingState {
  const started = beginSession({ ...initialState(), sessions: [] }, "B");
  current(started).results["b1"] = [
    { weight: "40", reps: "10", done: true },
    { weight: "40", reps: "8", done: true },
  ];
  current(started).results["b2"] = [{ weight: "60", reps: "7", done: true }];
  return closeSession(started, current(started).id);
}

describe("Confronto con l’ultima giornata completata", () => {
  it("recupera B dello stesso blocco anche saltando settimane", () => {
    const state = beginSession(completed(completed(completedB(), "D"), "D"), "B");
    expect(current(state).week).toBe(3);
    const previous = previousCompletedSession(state, current(state));
    expect(previous?.day).toBe("B");
    expect(previous?.week).toBe(1);
    expect(previous?.results["b1"]).toEqual([
      { weight: "40", reps: "10", done: true },
      { weight: "40", reps: "8", done: true },
    ]);
  });
  it("usa solo l’ultima B, senza recuperare esercizi assenti da sessioni più vecchie", () => {
    const latest = beginSession(completedB(), "B");
    current(latest).results = { b2: [{ weight: "65", reps: "9", done: true }] };
    const state = beginSession(closeSession(latest, current(latest).id), "B");
    const previous = previousCompletedSession(state, current(state));
    expect(previous?.id).toBe(current(latest).id);
    expect(previous?.results["b1"]).toBeUndefined();
    expect(previous?.results["b2"]?.[0]?.weight).toBe("65");
  });
  it("ignora giornate diverse, altri blocchi e sessioni in corso", () => {
    const state = beginSession(completedB(), "B");
    const original = state.sessions[0];
    if (!original) throw new Error();
    state.sessions.push(
      { ...original, id: "other-day", day: "A", order: 0.9 },
      { ...original, id: "other-block", blockId: "other", order: 0.9 },
      { ...original, id: "open", closedAt: null, order: 0.9 },
    );
    expect(previousCompletedSession(state, current(state))?.id).toBe(original.id);
  });
  it("mantiene il confronto per ID dopo il riordino senza compilare i campi attuali", () => {
    let state = completedB();
    const block = state.blocks[0];
    if (!block) throw new Error();
    state = saveBlock(state, { ...block, plan: reorderExercise(block.plan, "B", "b1", 1) });
    state = beginSession(state, "B");
    expect(current(state).snapshot?.exercises[0]?.id).toBe("b2");
    expect(previousCompletedSession(state, current(state))?.results["b2"]?.[0]).toEqual({
      weight: "60",
      reps: "7",
      done: true,
    });
    expect(current(state).results["b1"]?.[0]).toEqual({ weight: "", reps: "", done: false });
  });
  it("non inventa valori per esercizi nuovi o serie aggiuntive", () => {
    const state = beginSession(completedB(), "B");
    const previous = previousCompletedSession(state, current(state));
    expect(previous?.results["newExercise"]).toBeUndefined();
    expect(previous?.results["b1"]?.[2]).toBeUndefined();
  });
  it("non usa sessioni successive quando si riapre una vecchia sessione", () => {
    const state = completed(completedB(), "B");
    const older = state.sessions[0];
    if (!older) throw new Error();
    expect(previousCompletedSession(state, older)).toBeUndefined();
  });
  it("il backup conserva storico, avanzamento, note e sessione in corso col confronto", () => {
    const closed = completedB();
    const block = closed.blocks[0];
    if (!block) throw new Error();
    block.notes = { coach: "Recupero 90 secondi", personal: "Cintura" };
    block.dayNotes = {
      A: emptyNotes(),
      B: { coach: "Addome", personal: "Mattina" },
      C: emptyNotes(),
      D: emptyNotes(),
    };
    const exercise = block.plan.B[0];
    if (!exercise) throw new Error();
    exercise.seriesNotes = [{ coach: "Buffer 1", personal: "Presa" }];
    const state = beginSession(completed(closed, "D"), "B");
    const rows = current(state).results["b1"];
    if (!rows) throw new Error("Serie mancanti");
    rows[0] = { weight: "42.5", reps: "9", done: false };
    const restored = parseBackup(JSON.stringify(state));
    expect(restored.currentSessionId).toBe(state.currentSessionId);
    expect(restored.sessions).toHaveLength(3);
    expect(cursor(restored, block.id)).toEqual({ day: "A", week: 2 });
    expect(current(restored).results["b1"]?.[0]).toEqual({
      weight: "42.5",
      reps: "9",
      done: false,
    });
    expect(current(restored).snapshot?.blockNotes.personal).toBe("Cintura");
    expect(current(restored).snapshot?.dayNotes.coach).toBe("Addome");
    expect(current(restored).snapshot?.exercises[0]?.seriesNotes?.[0]?.coach).toBe("Buffer 1");
    expect(previousCompletedSession(restored, current(restored))?.results["b1"]?.[1]).toEqual({
      weight: "40",
      reps: "8",
      done: true,
    });
  });
});
