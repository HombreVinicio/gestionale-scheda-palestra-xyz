import { describe, expect, it } from "vitest";
import {
  changeExerciseSeries,
  exerciseSeriesTargets,
  resizeExerciseSeries,
  setExerciseRepetitions,
  validExercisePrescription,
  resolvedExercisePrescription,
} from "@/lib/prescription";
import {
  beginSession,
  closeSession,
  initialState,
  parseBackup,
  saveBlock,
  type Exercise,
} from "@/lib/training";

const example = (): Exercise => ({
  id: "test",
  name: "Movimento di prova",
  sets: 3,
  reps: "6-7 + 8-10 + 8-10",
  note: "",
  muscle: "",
});
describe("Prescrizioni delle singole serie", () => {
  it("usa gli obiettivi delle singole serie anche quando il riepilogo vecchio è incoerente", () => {
    const exercise = example();
    exercise.seriesTargets = [
      { role: "", reps: "6–7" },
      { role: "", reps: "12" },
      { role: "", reps: "8–10" },
    ];
    expect(resolvedExercisePrescription(exercise).reps).toBe("6–7 + 12 + 8–10");
    expect(exercise.reps).toBe("6-7 + 8-10 + 8-10");
  });
  it("risolve nuove sessioni e nuove chiusure senza toccare scheda, risultati o sessioni già concluse", () => {
    const state = initialState();
    const block = state.blocks[0];
    if (!block) throw new Error("Blocco mancante");
    block.plan.A = [example()];
    const settled = structuredClone(state.sessions);
    const started = beginSession(state, "A");
    expect(
      started.sessions.at(-1)?.snapshot?.exercises[0]?.seriesTargets?.map((t) => t.reps),
    ).toEqual(["6–7", "8–10", "8–10"]);
    expect(block.plan.A[0]?.seriesTargets).toBeUndefined();
    const session = started.sessions.at(-1);
    if (!session?.snapshot) throw new Error("Sessione mancante");
    session.snapshot.exercises = [example()];
    session.results["test"] = [
      { weight: "40", reps: "7", done: true },
      { weight: "35", reps: "10", done: true },
      { weight: "30", reps: "9", done: true },
    ];
    const closed = closeSession(started, session.id);
    expect(
      closed.sessions.at(-1)?.snapshot?.exercises[0]?.seriesTargets?.map((t) => t.reps),
    ).toEqual(["6–7", "8–10", "8–10"]);
    expect(closed.sessions.at(-1)?.results).toEqual(session.results);
    expect(closed.sessions.slice(0, settled.length)).toEqual(settled);
    const restored = parseBackup(JSON.stringify(closed));
    expect(restored.sessions.at(-1)).toEqual(closed.sessions.at(-1));
    expect(
      saveBlock(restored, {
        ...block,
        plan: { ...block.plan, A: [changeExerciseSeries(example(), 0, { reps: "15" })] },
      }).sessions,
    ).toEqual(restored.sessions);
  });
  it("corregge vecchi import senza obiettivi individuali", () => {
    expect(exerciseSeriesTargets(example()).map((t) => t.reps)).toEqual(["6–7", "8–10", "8–10"]);
  });
  it("recupera l’aggregato erroneamente ripetuto nelle tre serie", () => {
    const e = example();
    e.seriesTargets = Array.from({ length: 3 }, () => ({ role: "", reps: e.reps }));
    expect(exerciseSeriesTargets(e).map((t) => t.reps)).toEqual(["6–7", "8–10", "8–10"]);
  });
  it("modifica una serie senza cambiare le altre o l’originale", () => {
    const e = example();
    const next = changeExerciseSeries(e, 1, { reps: "10–12", role: "Back-off" });
    expect(next.seriesTargets).toEqual([
      { role: "", reps: "6–7" },
      { role: "Back-off", reps: "10–12" },
      { role: "", reps: "8–10" },
    ]);
    expect(e.seriesTargets).toBeUndefined();
  });
  it("mantiene vuota una serie cancellata e impedisce di attivare la scheda incompleta", () => {
    const e = changeExerciseSeries(example(), 1, { reps: "" });
    expect(exerciseSeriesTargets(e)[1]?.reps).toBe("");
    expect(validExercisePrescription(e)).toBe(false);
  });
  it("aggiunge serie senza inventare range quando quelli esistenti sono diversi", () => {
    const e = resizeExerciseSeries(example(), 4);
    expect(e.seriesTargets?.map((t) => t.reps)).toEqual(["6–7", "8–10", "8–10", ""]);
    expect(validExercisePrescription(e)).toBe(false);
  });
  it("rimuove solo la serie finale e la sua nota", () => {
    const e = example();
    e.seriesNotes = [
      { coach: "Buffer 1", personal: "" },
      { coach: "Buffer 0", personal: "" },
      { coach: "Ultima", personal: "" },
    ];
    const next = resizeExerciseSeries(e, 2);
    expect(next.seriesTargets?.map((t) => t.reps)).toEqual(["6–7", "8–10"]);
    expect(next.seriesNotes?.map((n) => n.coach)).toEqual(["Buffer 1", "Buffer 0"]);
    expect(e.seriesNotes).toHaveLength(3);
  });
  it("distribuisce i range inseriti nel campo comune anziché replicarli", () => {
    expect(
      setExerciseRepetitions(example(), "5 + 8 + 12").seriesTargets?.map((t) => t.reps),
    ).toEqual(["5", "8", "12"]);
  });
  it("non associa un aggregato con un numero di range ambiguo", () => {
    const e = { ...example(), reps: "6-7 + 8-10" };
    expect(exerciseSeriesTargets(e).map((t) => t.reps)).toEqual(["", "", ""]);
    expect(validExercisePrescription(e)).toBe(false);
  });
  it("conserva le correzioni nel backup e nella sessione successiva", () => {
    const state = initialState();
    const block = state.blocks[0];
    if (!block) throw new Error("Blocco mancante");
    block.plan.A = [changeExerciseSeries(example(), 1, { reps: "12" })];
    const restored = parseBackup(JSON.stringify(state));
    expect(
      beginSession(restored, "A")
        .sessions.at(-1)
        ?.snapshot?.exercises[0]?.seriesTargets?.map((t) => t.reps),
    ).toEqual(["6–7", "12", "8–10"]);
  });
});
