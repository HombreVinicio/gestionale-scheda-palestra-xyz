import { describe, expect, it } from "vitest";
import {
  beginSession,
  blockDays,
  closeSession,
  cursor,
  growBlockDays,
  initialState,
  parseBackup,
  removeBlockDays,
  saveBlock,
} from "@/lib/training";

describe("Numero di allenamenti modificabile", () => {
  it("mantiene le quattro giornate e tutto lo storico dei backup precedenti", () => {
    const old = initialState();
    const restored = parseBackup(JSON.stringify(old));
    const block = restored.blocks[0];
    if (!block) throw new Error();
    expect(blockDays(block)).toEqual(["A", "B", "C", "D"]);
    expect(restored.sessions.map((s) => s.results)).toEqual(old.sessions.map((s) => s.results));
  });
  it("aumentando a sei aggiunge E e F vuote senza cambiare le altre giornate", () => {
    const b = initialState().blocks[0];
    if (!b) throw new Error();
    const next = growBlockDays(b, 6);
    expect(blockDays(next)).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(next.plan["E"]).toEqual([]);
    expect(next.plan["F"]).toEqual([]);
    expect(next.plan.A).toEqual(b.plan.A);
  });
  it("dopo F completata propone A della settimana successiva", () => {
    const s = { ...initialState(), sessions: [] };
    const b = s.blocks[0];
    if (!b) throw new Error();
    s.blocks = [growBlockDays(b, 6)];
    const started = beginSession(s, "F");
    const closed = closeSession(started, started.currentSessionId ?? "");
    expect(cursor(closed, b.id)).toEqual({ day: "A", week: 2 });
    expect(parseBackup(JSON.stringify(closed)).blocks[0]?.dayOrder).toHaveLength(6);
  });
  it("sposta gli esercizi delle giornate scelte mantenendo ID, note e risultati storici", () => {
    const s = parseBackup(JSON.stringify(initialState()));
    const b = s.blocks[0];
    if (!b) throw new Error();
    const next = removeBlockDays(b, ["B", "D"], "C");
    expect(blockDays(next)).toEqual(["A", "C"]);
    expect(next.plan.C.map((e) => e.id)).toEqual(
      [...b.plan.C, ...b.plan.B, ...b.plan.D].map((e) => e.id),
    );
    const edited = saveBlock(s, next);
    expect(edited.sessions).toEqual(s.sessions);
    expect(edited.sessions[1]?.snapshot?.exercises[0]?.id).toBe("b1");
  });
  it("elimina dalla scheda senza cancellare sessioni e conserva la sessione aperta", () => {
    const s = beginSession(parseBackup(JSON.stringify(initialState())), "B");
    const b = s.blocks[0];
    if (!b) throw new Error();
    const edited = saveBlock(s, removeBlockDays(b, ["B"], null));
    expect(edited.blocks[0]?.plan.B).toEqual([]);
    expect(edited.sessions).toEqual(s.sessions);
    expect(edited.currentSessionId).toBe(s.currentSessionId);
    const restored = parseBackup(JSON.stringify(edited));
    expect(restored.sessions.at(-1)?.snapshot?.exercises[0]?.id).toBe("b1");
    expect(blockDays(restored.blocks[0] ?? b)).toEqual(["A", "C", "D"]);
  });
  it("rifiuta la cancellazione di tutte le giornate o una destinazione eliminata", () => {
    const b = initialState().blocks[0];
    if (!b) throw new Error();
    expect(removeBlockDays(b, ["A", "B", "C", "D"], null)).toBe(b);
    expect(removeBlockDays(b, ["B"], "B")).toBe(b);
  });
  it("propone la prima giornata effettiva e salta una giornata eliminata senza perdere il ciclo", () => {
    const s = { ...initialState(), sessions: [] };
    const b = s.blocks[0];
    if (!b) throw new Error();
    s.blocks = [removeBlockDays(b, ["A"], null)];
    expect(cursor(s, b.id)).toEqual({ day: "B", week: 1 });
    const started = beginSession(s, "B");
    const closed = closeSession(started, started.currentSessionId ?? "");
    const edited = saveBlock(closed, removeBlockDays(s.blocks[0] ?? b, ["B"], null));
    expect(cursor(edited, b.id)).toEqual({ day: "C", week: 1 });
  });
});
