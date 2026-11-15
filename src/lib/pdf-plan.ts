import { type Block } from "@/lib/training";
import { planFromPages, type PdfPage, type PdfRect } from "@/lib/pdf-tables";

export type PdfLine = { text: string; page: number };
// Unstructured lines cannot prove table membership and are never imported.
export function planFromLines(_lines: PdfLine[], name: string): Block {
  return planFromPages([], name);
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
    const pages: PdfPage[] = [];
    let textCount = 0;
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });
      const ops = await page.getOperatorList();
      const rects: PdfRect[] = [];
      ops.fnArray.forEach((op, i) => {
        if (op !== pdfjs.OPS.constructPath) return;
        const bounds = ops.argsArray[i]?.[2];
        if (bounds?.length === 4)
          rects.push({ left: bounds[0], bottom: bounds[1], right: bounds[2], top: bounds[3] });
      });
      const items = content.items.flatMap((item) =>
        "str" in item && item.str.trim()
          ? [
              {
                text: item.str,
                x: item.transform[4] ?? 0,
                y: item.transform[5] ?? 0,
                width: item.width,
                height: item.height,
              },
            ]
          : [],
      );
      textCount += items.length;
      pages.push({ page: number, width: viewport.width, height: viewport.height, items, rects });
    }
    if (!textCount)
      throw new Error(
        "Il PDF non contiene testo leggibile. Per un PDF scansionato inserisci manualmente esercizi e note; il riconoscimento delle immagini non è disponibile.",
      );
    const block = planFromPages(pages, name);
    const scanned = pages.filter((p) => !p.items.length);
    scanned.forEach((p) =>
      block.pendingNotes?.push({
        id: crypto.randomUUID(),
        text: "Pagina senza testo estraibile: verifica il PDF e inserisci manualmente eventuali dati. OCR non disponibile.",
        source: `Pagina ${p.page}`,
      }),
    );
    return { block, pages: document.numPages };
  } finally {
    await task.destroy();
  }
}
