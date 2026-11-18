import { describe, expect, it } from "vitest";
import { closeWeek, cursor, demoPlan, supersetClass, type TrainingState } from "@/lib/training";
const base = (): TrainingState => ({
  activeBlockId: "b", currentSessionId: null, sessions: [],
  blocks: [{ id: "b", name: "B", demo: false, archived: false, plan: demoPlan() }],
} as unknown as TrainingState);
describe("chiusura settimana e super serie", () => {
  it("chiude la settimana 1 senza allenamenti e riparte dal giorno A della 2", () => {
    expect(cursor(closeWeek(base()), "b")).toEqual({ day: "A", week: 2 });
  });
  it("collega due esercizi consecutivi", () => {
    const list = demoPlan().A.map((e, i) => ({ ...e, supersetNext: i === 0 }));
    expect(supersetClass(list, 0)).toContain("superset-first");
    expect(supersetClass(list, 1)).toContain("superset-last");
    expect(supersetClass(list, 2)).toBe("");
  });
});
