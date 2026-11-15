import { days, emptyNotes, type Block, type Day, type Exercise } from "@/lib/training";

export type PdfLine = { text: string; page: number };
// Only explicit day headings, complete exercise prescriptions and explicit series indices
// are associated automatically. All other text is retained for manual verification.
export function planFromLines(lines: PdfLine[], name: string): Block {
  const block: Block = {
    id: crypto.randomUUID(),
    name,
    archived: false,
    demo: false,
    plan: { A: [], B: [], C: [], D: [] },
    pendingNotes: [],
  };
  let day: Day | null = null;
  let exercise: Exercise | null = null;
  let page = 0;
  for (const line of lines) {
    if (line.page !== page) {
      exercise = null;
      day = null;
      page = line.page;
    }
    const text = line.text.trim();
    if (!text) continue;
    const heading = /^(?:giorno|giornata|allenamento)\s+([ABCD])(?:\s*[:·–-].*)?$/i.exec(text);
    if (heading) {
      day = days.find((d) => d === heading[1]?.toUpperCase()) ?? null;
      exercise = null;
      continue;
    }
    const row =
      /^(.+?)\s+(\d{1,2})\s*(?:[x×]|\|)\s*(\d+(?:\s*[-–]\s*\d+)?)\s*(?:rip(?:etizioni)?\.?)?$/i.exec(
        text.replace(/\|/g, " "),
      );
    if (day && row && Number(row[2]) >= 1 && Number(row[2]) <= 12) {
      exercise = {
        id: crypto.randomUUID(),
        name: row[1]?.trim() ?? "",
        sets: Number(row[2]),
        reps: row[3]?.trim() ?? "",
        note: "",
        muscle: "",
        seriesNotes: [],
      };
      block.plan[day].push(exercise);
      continue;
    }
    const series = /^serie\s+(\d+)\s*[:–-]\s*(.+)$/i.exec(text);
    if (exercise && series && Number(series[1]) >= 1 && Number(series[1]) <= exercise.sets) {
      const index = Number(series[1]) - 1;
      const notes = Array.from(
        { length: exercise.sets },
        (_, i) => exercise?.seriesNotes?.[i] ?? emptyNotes(),
      );
      notes[index] = {
        coach: [notes[index]?.coach, series[2]].filter(Boolean).join("\n"),
        personal: notes[index]?.personal ?? "",
      };
      exercise.seriesNotes = notes;
      continue;
    }
    block.pendingNotes?.push({ id: crypto.randomUUID(), text, source: `Pagina ${line.page}` });
    // A note or unrecognized row breaks exercise context to avoid assigning footer notes
    // or a following exercise's series to the preceding exercise.
    exercise = null;
  }
  return block;
}

export async function readPdf(file: File, name: string): Promise<{ block: Block; pages: number }> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useSystemFonts: true,
  });
  const document = await task.promise;
  try {
    const lines: PdfLine[] = [];
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      let text = "";
      let y: number | null = null;
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const currentY = item.transform[5] ?? 0;
        if (y !== null && Math.abs(currentY - y) > 3 && text.trim()) {
          lines.push({ text: text.trim(), page: number });
          text = "";
        }
        text += `${item.str} `;
        y = currentY;
        if (item.hasEOL) {
          if (text.trim()) lines.push({ text: text.trim(), page: number });
          text = "";
          y = null;
        }
      }
      if (text.trim()) lines.push({ text: text.trim(), page: number });
    }
    if (!lines.length)
      throw new Error(
        "Il PDF non contiene testo leggibile. Per un PDF scansionato inserisci manualmente esercizi e note; il riconoscimento delle immagini non è disponibile.",
      );
    return { block: planFromLines(lines, name), pages: document.numPages };
  } finally {
    await task.destroy();
  }
}
