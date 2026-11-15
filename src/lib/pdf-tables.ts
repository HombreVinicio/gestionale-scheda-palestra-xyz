import { days, emptyNotes, type Block, type Day, type Exercise } from "@/lib/training";

export type PdfText = { text: string; x: number; y: number; width: number; height: number };
export type PdfRect = { left: number; right: number; bottom: number; top: number };
export type PdfPage = {
  page: number;
  width: number;
  height: number;
  items: PdfText[];
  rects: PdfRect[];
};
type Cell = PdfRect & { text: string; items: PdfText[] };
type Column = { role: string; left: number; right: number };
const compact = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f\s.\-_:]/g, "");
function header(text: string) {
  const s = compact(text);
  if (/^(esercizio|esercizi|exercise|exercises|movimento|nomeesercizio)$/.test(s)) return "name";
  if (/^(serie|series|sets|nserie|numeroserie)$/.test(s)) return "sets";
  if (/^(ripetizioni|rip|reps|reprange|repetitions)$/.test(s)) return "reps";
  if (/^(note|notes|indicazioni|istruzioni|tecnica)$/.test(s)) return "notes";
  if (/^(setn?\d+|risultati|peso|kg|carico)/.test(s)) return "results";
  return "";
}
function textOf(items: PdfText[]) {
  const lines: { y: number; parts: PdfText[] }[] = [];
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    let line = lines.find((l) => Math.abs(l.y - item.y) < Math.max(2, item.height * 0.25));
    if (!line) {
      line = { y: item.y, parts: [] };
      lines.push(line);
    }
    line.parts.push(item);
  }
  return lines
    .map((l) => {
      const parts = l.parts.sort((a, b) => a.x - b.x);
      return parts
        .map((p, i) => {
          const prev = parts[i - 1];
          return `${prev && p.x - (prev.x + prev.width) > Math.max(0.8, p.height * 0.1) ? " " : ""}${p.text}`;
        })
        .join("")
        .replace(/\s+/g, " ")
        .trim();
    })
    .join("\n");
}
const inside = (r: PdfRect, t: PdfText) =>
  t.x >= r.left - 1 && t.x < r.right && t.y >= r.bottom && t.y <= r.top;
function cellsFor(page: PdfPage): Cell[] {
  const cells: Cell[] = [];
  for (const item of page.items) {
    const rect = page.rects
      .filter(
        (r) =>
          inside(r, item) &&
          r.right - r.left > item.width * 0.6 &&
          r.right - r.left < page.width * 0.8 &&
          r.top - r.bottom >= item.height &&
          r.top - r.bottom < page.height * 0.25,
      )
      .sort(
        (a, b) => (a.right - a.left) * (a.top - a.bottom) - (b.right - b.left) * (b.top - b.bottom),
      )[0];
    if (!rect) continue;
    let cell = cells.find(
      (c) =>
        Math.abs(c.left - rect.left) < 1 &&
        Math.abs(c.bottom - rect.bottom) < 1 &&
        Math.abs(c.top - rect.top) < 1 &&
        Math.abs(c.right - rect.right) < 1,
    );
    if (!cell) {
      cell = { ...rect, text: "", items: [] };
      cells.push(cell);
    }
    cell.items.push(item);
  }
  cells.forEach((c) => {
    c.text = textOf(c.items);
  });
  return cells;
}
export function repetitionRange(raw: string): string | null {
  const s = raw.trim();
  const m = /^(\d+)\s*(?:[\/–-]\s*(\d+))?\s*(?:rip\.?|reps)?$/i.exec(s);
  return m ? `${m[1]}${m[2] ? `–${m[2]}` : ""}` : null;
}
export function exerciseFromCells(
  name: string,
  setsRaw: string,
  repsRaw: string,
  note: string,
  source: string,
): Exercise | null {
  const roles = setsRaw.split("+").map((s) => s.trim());
  const topBack =
    roles.length === 2 &&
    /^top\s*set$/i.test(roles[0] ?? "") &&
    /^back\s*of{1,2}$/i.test(roles[1] ?? "");
  const n = /^\d+$/.test(setsRaw.trim()) ? Number(setsRaw.trim()) : topBack ? 2 : 0;
  if (!name.trim() || n < 1 || n > 12) return null;
  const rawRanges = repsRaw.split("+");
  const ranges = rawRanges.map(repetitionRange);
  const issues: string[] = [];
  if (!repsRaw.trim()) issues.push("Ripetizioni mancanti");
  else if (ranges.some((r) => r === null) || (rawRanges.length > 1 && rawRanges.length !== n))
    issues.push("Ripetizioni da verificare");
  const targets =
    topBack || (rawRanges.length === n && n > 1)
      ? Array.from({ length: n }, (_, i) => ({
          role: topBack ? (i === 0 ? "Top set" : "Back-off") : "",
          reps: ranges[i] ?? rawRanges[i]?.trim() ?? "",
        }))
      : undefined;
  const seriesNotes = Array.from({ length: n }, emptyNotes);
  const bufferLines = note.split("\n").filter((s) => /^buffer\s*\d+\.?$/i.test(s.trim()));
  let generalNote = note;
  if (
    topBack &&
    bufferLines.length === n &&
    bufferLines.length === note.split("\n").filter(Boolean).length
  ) {
    bufferLines.forEach((s, i) => {
      seriesNotes[i] = { coach: s.replace(/^buffer\s*/i, "Buffer "), personal: "" };
    });
    generalNote = "";
    issues.push("Associazione buffer per ordine nella cella: verificare");
  }
  const explicit = /(?:serie\s*(\d+)\s*[:–-]\s*([^\n]+))/gi;
  generalNote = generalNote
    .replace(explicit, (whole, index: string, value: string) => {
      const i = Number(index) - 1;
      if (i < 0 || i >= n) {
        issues.push("Indice serie da verificare");
        return whole;
      }
      seriesNotes[i] = { coach: value.trim(), personal: "" };
      return "";
    })
    .trim();
  return {
    id: crypto.randomUUID(),
    name: name.replace(/\s+/g, " ").trim(),
    sets: n,
    reps: ranges.every((r) => r !== null) ? ranges.join(" + ") : repsRaw.trim(),
    note: generalNote,
    muscle: "",
    seriesTargets: targets,
    seriesNotes,
    importSource: source,
    reviewIssues: issues,
  };
}

export function planFromPages(pages: PdfPage[], name: string): Block {
  const block: Block = {
    id: crypto.randomUUID(),
    name,
    archived: false,
    demo: false,
    plan: { A: [], B: [], C: [], D: [] },
    pendingNotes: [],
    accessories: [],
    notes: emptyNotes(),
  };
  let day: Day | null = null;
  let previousColumns: Column[] = [];
  const discovered: Day[] = [];
  const pending = (text: string, source: string) =>
    block.pendingNotes?.push({ id: crypto.randomUUID(), text, source });
  for (const page of pages) {
    const used = new Set<PdfText>();
    const cells = cellsFor(page);
    const lineItems: { text: string; items: PdfText[]; y: number }[] = [];
    // Build geometric text lines independently of cell text wrapping.
    for (const t of [...page.items].sort((a, b) => b.y - a.y || a.x - b.x)) {
      let l = lineItems.find((l) => Math.abs(l.y - t.y) < Math.max(2, t.height * 0.25));
      if (!l) {
        l = { text: "", items: [], y: t.y };
        lineItems.push(l);
      }
      l.items.push(t);
      l.text = textOf(l.items).replace(/\n/g, " ");
    }
    const headings = lineItems.filter((l) =>
      /^(?:giorno|giornata|day|allenamento)\s*([A-Z]|\d{1,2})\s*[:.–-]?(?:\s+.*)?$/i.test(l.text),
    );
    const tables: { top: number; bottom: number; columns: Column[]; headerItems: PdfText[] }[] = [];
    const headerCells = cells.filter((c) => header(c.text) === "name");
    for (const c of headerCells) {
      const peers = cells.filter(
        (p) => Math.abs(p.top - c.top) < 2 && Math.abs(p.bottom - c.bottom) < 2,
      );
      const columns = peers
        .map((p) => ({ role: header(p.text), left: p.left, right: p.right }))
        .sort((a, b) => a.left - b.left);
      if (!columns.some((c) => c.role === "sets") || !columns.some((c) => c.role === "reps"))
        continue;
      const below = cells.filter(
        (p) =>
          p.top <= c.bottom + 1 &&
          columns.some(
            (col) => Math.abs(col.left - p.left) < 1 && Math.abs(col.right - p.right) < 1,
          ),
      );
      const nextHeading = headings.find((h) => h.y < c.bottom);
      const bottom = Math.min(
        c.bottom,
        ...below.filter((p) => !nextHeading || p.top > nextHeading.y).map((p) => p.bottom),
      );
      tables.push({ top: c.top, bottom, columns, headerItems: peers.flatMap((p) => p.items) });
    }
    // Borderless tables: infer header starts and row boundaries from the series column.
    for (const l of lineItems) {
      if (tables.some((t) => l.y <= t.top && l.y >= t.bottom)) continue;
      const parts = l.items.filter((i) => header(i.text));
      if (
        !parts.some((i) => header(i.text) === "name") ||
        !parts.some((i) => header(i.text) === "sets") ||
        !parts.some((i) => header(i.text) === "reps")
      )
        continue;
      const sorted = parts.sort((a, b) => a.x - b.x);
      const columns = sorted.map((p, i) => ({
        role: header(p.text),
        left: p.x - 3,
        right: sorted[i + 1] ? (sorted[i + 1]?.x ?? page.width) - 3 : page.width,
      }));
      const stop = lineItems.find(
        (x) =>
          x.y < l.y &&
          /^(giorno|giornata|day|note|cardio|addome|polpacci|faq|domande)\b/i.test(x.text),
      );
      tables.push({
        top: l.y - 1,
        bottom: stop ? stop.y + Math.max(...stop.items.map((p) => p.height)) : 0,
        columns,
        headerItems: l.items,
      });
    }
    // A headerless continuation is accepted only when aligned prescription cells prove it.
    if (!tables.length && previousColumns.length && day) {
      const setCol = previousColumns.find((c) => c.role === "sets");
      const candidates = cells.filter(
        (c) => setCol && Math.abs(c.left - setCol.left) < 2 && /^(\d+|top\s*set)/i.test(c.text),
      );
      if (candidates.length)
        tables.push({
          top: Math.max(...candidates.map((c) => c.top)) + 3,
          bottom: Math.min(...candidates.map((c) => c.bottom)),
          columns: previousColumns,
          headerItems: [],
        });
    }
    for (const table of tables.sort((a, b) => b.top - a.top)) {
      const h = headings.filter((h) => h.y >= table.top - 2).at(-1);
      if (h) {
        const match = /^(?:giorno|giornata|day|allenamento)\s*([A-Z]|\d{1,2})\b/i.exec(h.text);
        const label = match?.[1]?.toUpperCase();
        day = days.find((d, i) => d === label || String(i + 1) === label) ?? null;
        if (day && !discovered.includes(day)) discovered.push(day);
        if (day && !block.plan[day]) block.plan[day] = [];
        h.items.forEach((i) => used.add(i));
      }
      table.headerItems.forEach((i) => used.add(i));
      previousColumns = table.columns;
      const nameCol = table.columns.find((c) => c.role === "name");
      const setCol = table.columns.find((c) => c.role === "sets");
      if (!nameCol || !setCol) continue;
      let rows = cells
        .filter(
          (c) =>
            Math.abs(c.left - nameCol.left) < 1 &&
            Math.abs(c.right - nameCol.right) < 1 &&
            c.top < table.top - 2 &&
            c.bottom >= table.bottom - 1 &&
            header(c.text) !== "name",
        )
        .map((c) => ({ top: c.top, bottom: c.bottom }));
      if (!rows.length) {
        const anchors = lineItems.filter(
          (l) =>
            l.y < table.top &&
            l.y >= table.bottom &&
            l.items.some(
              (i) =>
                i.x >= setCol.left && i.x < setCol.right && /^(\d+|top\s*set)/i.test(i.text.trim()),
            ),
        );
        rows = anchors.map((a, i) => ({
          top: i === 0 ? table.top : a.y + Math.max(...a.items.map((t) => t.height)),
          bottom: anchors[i + 1]
            ? (anchors[i + 1]?.y ?? 0) +
              Math.max(...(anchors[i + 1]?.items.map((t) => t.height) ?? [0]))
            : table.bottom,
        }));
      }
      for (const row of rows.sort((a, b) => b.top - a.top)) {
        const first = table.columns[0],
          last = table.columns.at(-1);
        if (!first || !last) continue;
        const items = page.items.filter(
          (i) => i.y >= row.bottom && i.y < row.top && i.x >= first.left && i.x < last.right,
        );
        const value = (role: string) =>
          textOf(
            items.filter((i) =>
              table.columns.some((c) => c.role === role && i.x >= c.left - 1 && i.x < c.right),
            ),
          );
        const source = `Pagina ${page.page}`;
        const original = table.columns
          .map((c) => textOf(items.filter((i) => i.x >= c.left - 1 && i.x < c.right)))
          .filter(Boolean)
          .join(" | ");
        const ex = exerciseFromCells(
          value("name"),
          value("sets"),
          value("reps"),
          value("notes"),
          original,
        );
        if (
          ex &&
          table.columns.some((c) => !c.role && items.some((i) => i.x >= c.left && i.x < c.right))
        )
          ex.reviewIssues?.push("Colonna non riconosciuta: verifica il testo originale");
        if (ex && day) block.plan[day]?.push(ex);
        else if (original) pending(original, `${source} · riga da verificare`);
        items.forEach((i) => used.add(i));
      }
    }
    // Text outside recognized table rows is intentionally ignored.
    for (const h of headings) {
      const match = /^(?:giorno|giornata|day|allenamento)\s*([A-Z]|\d{1,2})\b/i.exec(h.text);
      const label = match?.[1]?.toUpperCase();
      const found = days.find((d, i) => d === label || String(i + 1) === label);
      if (found) day = found;
    }
  }
  block.dayOrder = discovered.length ? discovered : ["A"];
  return block;
}
