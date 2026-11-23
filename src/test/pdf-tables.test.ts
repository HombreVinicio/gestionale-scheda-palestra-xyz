import { describe, expect, it } from "vitest";
import { exerciseFromCells, planFromPages, type PdfPage } from "@/lib/pdf-tables";
import { initialState, parseBackup, beginSession, discardNewDraft } from "@/lib/training";
import { readFileSync } from "node:fs";
function table(
  page: number,
  columns: string[],
  rows: string[][],
  heading = "Giorno A",
  withHeader = true,
): PdfPage {
  const p: PdfPage = { page, width: 700, height: 900, items: [], rects: [] };
  if (heading) p.items.push({ text: heading, x: 40, y: 830, width: 80, height: 10 });
  const contents = withHeader ? [columns, ...rows] : rows;
  contents.forEach((row, r) =>
    row.forEach((text, c) => {
      const top = 800 - r * 50,
        left = 40 + c * 100;
      p.rects.push({ left, right: left + 100, top, bottom: top - 50 });
      text.split("\n").forEach((t, i) => {
        if (t)
          p.items.push({
            text: t,
            x: left + 5,
            y: top - 15 - i * 12,
            width: t.length * 4,
            height: 10,
          });
      });
    }),
  );
  return p;
}
describe("Importazione riutilizzabile delle tabelle PDF", () => {
  it.each(["6-7 + 8-10 + 8-10", "6/7\n8/10\n8/10"])(
    "distribuisce tre range sulle tre serie: %s",
    (raw) => {
      const b = planFromPages(
        [table(1, ["Esercizio", "Serie", "Ripetizioni"], [["Movimento di prova", "3", raw]])],
        "Test",
      );
      expect(b.plan.A[0]?.seriesTargets?.map((target) => target.reps)).toEqual([
        "6–7",
        "8–10",
        "8–10",
      ]);
    },
  );
  it("elimina solo la bozza nuova mantenendo blocchi, sessione e avanzamento", () => {
    const s = beginSession(initialState(), "B");
    const block = s.blocks[0];
    if (!block) throw new Error("Blocco mancante");
    s.editorDraft = { mode: "new", block: structuredClone(block), source: "Test", imported: true };
    const next = discardNewDraft(s);
    expect(next.editorDraft).toBeUndefined();
    expect(next.blocks).toEqual(s.blocks);
    expect(next.sessions).toEqual(s.sessions);
    expect(next.currentSessionId).toBe(s.currentSessionId);
    expect(next.activeBlockId).toBe(s.activeBlockId);
    expect(
      discardNewDraft({ ...s, editorDraft: { ...s.editorDraft, mode: "edit" } }).editorDraft?.mode,
    ).toBe("edit");
  });
  it("ricava intestazioni riordinate, nuovi esercizi, nomi multilinea e quantità diverse", () => {
    const b = planFromPages(
      [
        table(
          1,
          ["Reps", "Notes", "Exercise", "Sets"],
          [
            ["12/15", "Presa larga", "Trazione\nagligli anelli", "4"],
            ["6", "Pausa", "Zercher squat", "1"],
          ],
        ),
      ],
      "Test",
    );
    expect(b.plan.A.map((e) => [e.name, e.sets, e.reps])).toEqual([
      ["Trazione agligli anelli", 4, "12–15"],
      ["Zercher squat", 1, "6"],
    ]);
    expect(b.plan.A[0]?.note).toBe("Presa larga");
  });
  it("mantiene il giorno nella tabella continuata senza intestazione sulla pagina successiva", () => {
    const b = planFromPages(
      [
        table(1, ["Esercizio", "Serie", "Ripetizioni"], [["Rematore", "5", "10"]], "Giorno 2"),
        table(2, ["Esercizio", "Serie", "Ripetizioni"], [["Affondi", "2", "8/12"]], "", false),
      ],
      "Test",
    );
    expect(b.plan.B.map((e) => e.name)).toEqual(["Rematore", "Affondi"]);
    expect(b.plan.B[1]?.sets).toBe(2);
  });
  it("non usa SET N.1/N.2/N.3 come quantità di serie", () => {
    const b = planFromPages(
      [
        table(
          1,
          ["Esercizio", "Serie", "Ripetizioni", "SET N.1", "SET N.2", "SET N.3"],
          [["Dip", "1", "9", "", "", ""]],
        ),
      ],
      "Test",
    );
    expect(b.plan.A[0]?.sets).toBe(1);
  });
  it("riconosce top set, back-off, range distinti e buffer verificabili", () => {
    const e = exerciseFromCells(
      "Stacco",
      "TOPSET + Back off",
      "6/8 + 8/10",
      "Buffer 1\nBuffer 0",
      "originale",
    );
    expect(e?.sets).toBe(2);
    expect(e?.seriesTargets).toEqual([
      { role: "Top set", reps: "6–8" },
      { role: "Back-off", reps: "8–10" },
    ]);
    expect(e?.seriesNotes?.map((n) => n.coach)).toEqual(["Buffer 1", "Buffer 0"]);
    expect(e?.reviewIssues).toContain("Associazione buffer per ordine nella cella: verificare");
  });
  it("conserva valori mancanti e notazioni sconosciute senza inventare prescrizioni", () => {
    const b = planFromPages(
      [
        table(
          1,
          ["Movimento", "Serie", "Rip."],
          [
            ["Curl", "3", ""],
            ["Squat", "cluster libero", "AMRAP"],
            ["Press", "2", "max tecnico"],
          ],
        ),
      ],
      "Test",
    );
    expect(b.plan.A[0]?.reps).toBe("");
    expect(b.plan.A[0]?.reviewIssues).toContain("Ripetizioni mancanti");
    expect(b.plan.A[1]?.reps).toBe("max tecnico");
    expect(b.pendingNotes?.map((n) => n.text).join(" ")).toContain("cluster libero | AMRAP");
  });
  it("salva metadati, accessori e ripetizioni mancanti nella bozza e nel backup", () => {
    const b = planFromPages(
      [table(1, ["Esercizio", "Serie", "Ripetizioni"], [["Curl", "3", ""]])],
      "Test",
    );
    b.accessories = [{ id: "x", text: "Cardio: 2 volte", source: "Pagina 1" }];
    const state = initialState();
    state.editorDraft = { mode: "new", block: b, source: "Test", imported: true };
    const restored = parseBackup(JSON.stringify(state));
    expect(restored.editorDraft?.block.plan.A[0]?.reps).toBe("");
    expect(restored.editorDraft?.block.accessories?.[0]?.text).toBe("Cardio: 2 volte");
    const exercise = exerciseFromCells("Press", "Topset + Backoff", "6/8 + 8/10", "", "originale");
    if (!exercise) throw new Error("Esercizio mancante");
    state.blocks[0]?.plan.A.push(exercise);
    expect(
      beginSession(state, "A").sessions.at(-1)?.snapshot?.exercises.at(-1)?.seriesTargets?.[1]
        ?.reps,
    ).toBe("8–10");
  });
  it("ignora tutto il testo esterno ma conserva le note della riga", () => {
    const p = table(
      1,
      ["Esercizio", "Serie", "Reps", "Note"],
      [["Calf nuovo", "2", "12", "Serie 1: Buffer 1\nSerie 2: Buffer 0"]],
      "Giorno E",
    );
    [
      "Introduzione",
      "FAQ",
      "Note generali",
      "Cardio 15 min",
      "Addome 3 x 12",
      "Polpacci 4 x 10",
    ].forEach((text, i) => p.items.push({ text, x: 40, y: 600 - i * 20, width: 100, height: 10 }));
    const b = planFromPages([p], "Test");
    expect(b.dayOrder).toEqual(["E"]);
    expect(b.plan["E"]?.map((e) => e.name)).toEqual(["Calf nuovo"]);
    expect(b.plan["E"]?.[0]?.seriesNotes?.map((n) => n.coach)).toEqual(["Buffer 1", "Buffer 0"]);
    expect(b.pendingNotes).toEqual([]);
    expect(b.accessories).toEqual([]);
    expect(b.notes?.coach).toBe("");
  });
  it("legge una tabella senza bordi con intestazioni e righe semplici", () => {
    const p = table(
      1,
      ["Esercizio", "Serie", "Reps", "Note"],
      [
        ["Step up", "4", "12", "Controllo"],
        ["Pendlay", "2", "5/7", ""],
      ],
    );
    p.rects = [];
    expect(planFromPages([p], "Test").plan.A.map((e) => e.name)).toEqual(["Step up", "Pendlay"]);
  });
});

// Optional private geometry fixture: never check personal PDFs or extracted text into Git.
describe.skipIf(!process.env["PDF_REAL_GEOMETRY"])("PDF reale fornito dall’utente", () => {
  const read = () =>
    planFromPages(
      JSON.parse(readFileSync(process.env["PDF_REAL_GEOMETRY"] ?? "", "utf8")),
      "Verifica privata",
    );
  it("contiene 25 esercizi distribuiti 6/6/6/7", () => {
    const b = read();
    expect([b.plan.A.length, b.plan.B.length, b.plan.C.length, b.plan.D.length]).toEqual([
      6, 6, 6, 7,
    ]);
  });
  it("unisce CHEST PRESS Incline e conserva due range per top set e back-off", () => {
    const e = read().plan.A[0];
    expect(e?.name).toBe("CHEST PRESS Incline");
    expect(e?.sets).toBe(2);
    expect(e?.seriesTargets?.map((t) => t.reps)).toEqual(["6–8", "8–10"]);
  });
  it("mantiene Leg curl Seduto con 3 serie e ripetizioni vuote", () => {
    const e = read().plan.B.find((e) => e.name === "Leg curl Seduto");
    expect(e?.sets).toBe(3);
    expect(e?.reps).toBe("");
  });
  it("conserva i due buffer di SLDL nelle rispettive serie da verificare", () => {
    const e = read().plan.D.find((e) => e.name === "SLDL");
    expect(e?.seriesNotes?.map((n) => n.coach)).toEqual(["Buffer 1", "Buffer 0"]);
    expect(e?.reviewIssues?.length).toBe(1);
  });
  it("ignora cardio, note generali e altre indicazioni fuori dalle tabelle", () => {
    const b = read();
    expect(b.accessories).toEqual([]);
    expect(b.notes?.coach).toBe("");
    expect(b.pendingNotes?.some((n) => /Standing Calf oppure/.test(n.text))).toBe(false);
  });
});
