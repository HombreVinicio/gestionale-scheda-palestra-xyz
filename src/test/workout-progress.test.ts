import { describe, expect, it } from "vitest";
import {
  beginSession,
  closeSession,
  cursor,
  exerciseProgress,
  initialState,
  parseBackup,
  reopenSession,
  type Day,
  type TrainingState,
} from "@/lib/training";

function close(state: TrainingState, day: Day) {
  const started = beginSession(state, day);
  return closeSession(started, started.currentSessionId ?? "");
}

describe("Settimane in ordine libero", () => {
  it("D, B, A non avanzano la settimana: C chiude il ciclo", () => {
    let state: TrainingState = { ...initialState(), sessions: [] };
    for (const day of ["D", "B", "A"] as const) {
      state = close(state, day);
      expect(cursor(state, "demo-block-1").week).toBe(1);
    }
    expect(cursor(state, "demo-block-1").day).toBe("C");
    state = close(state, "C");
    expect(cursor(state, "demo-block-1")).toEqual({ day: "A", week: 2 });
  });
  it("ripetere D non sostituisce A, B o C", () => {
    const state = close(close({ ...initialState(), sessions: [] }, "D"), "D");
    expect(cursor(state, "demo-block-1")).toEqual({ day: "A", week: 1 });
  });
  it("una sessione aperta non completa la giornata e il backup conserva il ciclo", () => {
    const state = beginSession(
      close(close(close({ ...initialState(), sessions: [] }, "D"), "B"), "A"),
      "C",
    );
    const restored = parseBackup(JSON.stringify(state));
    expect(cursor(restored, "demo-block-1")).toEqual({ day: "C", week: 1 });
    expect(
      cursor(closeSession(restored, restored.currentSessionId ?? ""), "demo-block-1").week,
    ).toBe(2);
  });
  it("riaprire una vecchia settimana non annulla la successiva", () => {
    let state: TrainingState = { ...initialState(), sessions: [] };
    for (const day of ["D", "B", "A", "C", "A"] as const) state = close(state, day);
    const first = state.sessions[0];
    if (!first) throw new Error("Sessione mancante");
    expect(cursor(reopenSession(state, first.id), "demo-block-1")).toEqual({ day: "B", week: 2 });
  });
});

describe("Completamento esercizio", () => {
  it("chiude solo quando tutte le serie sono fatte", () => {
    expect(
      exerciseProgress([
        { weight: "40", reps: "10", done: true },
        { weight: "40", reps: "8", done: false },
      ]),
    ).toEqual({ remaining: 1, complete: false });
    expect(
      exerciseProgress([
        { weight: "40", reps: "10", done: true },
        { weight: "40", reps: "8", done: true },
      ]),
    ).toEqual({ remaining: 0, complete: true });
  });
  it("una serie riaperta torna mancante", () => {
    expect(exerciseProgress([{ weight: "42.5", reps: "9", done: false }])).toEqual({
      remaining: 1,
      complete: false,
    });
  });
});
