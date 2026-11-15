import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, Check, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/app-shell";
import { ConfirmModal } from "@/components/confirm-modal";
import { BlockEditor, validBlock } from "@/components/block-editor";
import { useTraining } from "@/components/training-provider";
import { demoPlan, discardNewDraft, migrateState, type Block } from "@/lib/training";
import { readPdf } from "@/lib/pdf-plan";
export const Route = createFileRoute("/nuovo-blocco")({
  head: () => ({
    meta: [
      { title: "Nuovo blocco · SERIE" },
      {
        name: "description",
        content: "Importa un PDF e verifica esercizi e note prima di attivare il blocco.",
      },
      { property: "og:title", content: "Nuovo blocco · SERIE" },
      { property: "og:description", content: "Lettura locale del PDF e controllo della scheda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewBlock,
});
function NewBlock() {
  const { state, update, ready, saveError } = useTraining();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [deleteDraft, setDeleteDraft] = useState(false);
  const draft = state.editorDraft?.mode === "new" ? state.editorDraft : null;
  const name = `Blocco ${state.blocks.length + 1}`;
  const setDraft = (block: Block, source: string, imported: boolean) =>
    update((s) => ({ ...s, editorDraft: { mode: "new", block, source, imported } }));
  if (!ready) return <p className="text-muted">Caricamento scheda…</p>;
  return (
    <div className="content-narrow">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} />
        Allenamento
      </Link>
      <PageHeading title={draft ? "Controlla la scheda" : "Nuovo blocco"} />
      {draft ? (
        <>
          <div className="notice">
            {draft.imported ? (
              <>
                PDF letto sul dispositivo · {draft.source}
                <br />
                 Verifica esercizi, serie e note delle tabelle.
              </>
            ) : draft.block.demo ? (
              <>
                <strong>Anteprima dimostrativa · PDF non letto</strong>
                <br />
                Scheda di esempio modificabile.
              </>
            ) : (
              "Scheda inserita manualmente · PDF non letto"
            )}
          </div>
          <BlockEditor
            block={draft.block}
            onChange={(block) => setDraft(block, draft.source, draft.imported)}
          />
          {!validBlock(draft.block) && (
            <p className="error-message">
              Completa tutte le giornate, i nomi e le ripetizioni. Serie: da 1 a 12.
            </p>
          )}
          {state.currentSessionId && (
            <p className="notice">
              Chiudi l’allenamento in corso prima di attivare il nuovo blocco.
            </p>
          )}
          <div className="sticky-action editor-action">
            <Button variant="ghost" onClick={() => setDeleteDraft(true)}>
              <Trash2 />
              Elimina bozza
            </Button>
            <Button
              disabled={!validBlock(draft.block) || Boolean(state.currentSessionId)}
              onClick={() => setConfirm(true)}
            >
              Attiva blocco
              <Check />
            </Button>
          </div>
          <p className="tiny text-muted mt-3">
            {saveError ? "Salvataggio non riuscito" : "Bozza salvata sul dispositivo"}
          </p>
        </>
      ) : (
        <>
          <div className="notice">
            Il PDF viene letto solo su questo dispositivo. Le indicazioni senza associazione certa
            restano da verificare. I PDF scansionati richiedono inserimento manuale.
          </div>
          <div className="upload-zone">
            <Upload size={36} />
            <Button disabled={busy} onClick={() => fileRef.current?.click()}>
              <Plus />
              {busy ? "Lettura PDF…" : "Carica PDF del coach"}
            </Button>
            <div className="settings-actions justify-center">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  setDraft(
                    {
                      id: crypto.randomUUID(),
                      name,
                      demo: false,
                      archived: false,
                      plan: { A: [], B: [], C: [], D: [] },
                    },
                    "",
                    false,
                  )
                }
              >
                Inserisci manualmente
              </Button>
              <Button
                variant="link"
                disabled={busy}
                onClick={() =>
                  setDraft(
                    {
                      id: crypto.randomUUID(),
                      name,
                      demo: true,
                      archived: false,
                      plan: demoPlan(),
                    },
                    "",
                    false,
                  )
                }
              >
                Prova senza PDF
              </Button>
            </div>
          </div>
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        aria-label="PDF del coach"
        onChange={async (e) => {
          const input = e.currentTarget;
          const file = input.files?.[0];
          if (!file) return;
          setError("");
          setBusy(true);
          try {
            if (!file.name.toLowerCase().endsWith(".pdf"))
              throw new Error("Scegli un documento PDF.");
            const result = await readPdf(file, name);
            setDraft(result.block, `${file.name} · ${result.pages} pagine`, true);
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "PDF non leggibile. Inserisci manualmente la scheda.",
            );
          } finally {
            setBusy(false);
            input.value = "";
          }
        }}
      />
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {confirm && draft && (
        <ConfirmModal
          title={`Attivare ${draft.block.name}?`}
          description={`Il blocco attuale sarà archiviato. Il nuovo inizia dalla settimana 1, giorno A.${draft.block.pendingNotes?.length ? ` ${draft.block.pendingNotes.length} indicazioni restano da verificare: saranno conservate nella scheda.` : ""}`}
          confirm="Attiva blocco"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            update((s) => {
              if (s.currentSessionId) return s;
              const migrated = migrateState(s);
              const { editorDraft: _draft, ...rest } = migrated;
              return {
                ...rest,
                activeBlockId: draft.block.id,
                blocks: [
                  ...rest.blocks.map((b) =>
                    b.id === rest.activeBlockId ? { ...b, archived: true } : b,
                  ),
                  structuredClone(draft.block),
                ],
              };
            });
            void navigate({ to: "/" });
          }}
        />
      )}
      {deleteDraft && draft && (
        <ConfirmModal
          title="Eliminare la bozza?"
          description="La scheda importata e le modifiche della bozza saranno eliminate. Il blocco attivo e lo storico non cambiano."
          confirm="Elimina bozza"
          onCancel={() => setDeleteDraft(false)}
          onConfirm={() => {
            update(discardNewDraft);
            setDeleteDraft(false);
          }}
        />
      )}
    </div>
  );
}
