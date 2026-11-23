import { describe, expect, it } from "vitest";
import {
  changeExerciseSeries,
  exerciseSeriesTargets,
  resizeExerciseSeries,
  setExerciseRepetitions,
  validExercisePrescription,
} from "@/lib/prescription";
import { beginSession, initialState, parseBackup, type Exercise } from "@/lib/training";

const example = (): Exercise => ({
  id: "test",
  name: "Movimento di prova",
  sets: 3,
  reps: "6-7 + 8-10 + 8-10",
  note: "",
  muscle: "",
});
describe("Prescrizioni delle singole serie", () => {
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
