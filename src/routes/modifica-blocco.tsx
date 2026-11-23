import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/app-shell";
import { BlockEditor, validBlock } from "@/components/block-editor";
import { useTraining } from "@/components/training-provider";
import { saveBlock } from "@/lib/training";
export const Route = createFileRoute("/modifica-blocco")({
  head: () => ({
    meta: [
      { title: "Modifica blocco · SERIE" },
      { name: "description", content: "Modifica esercizi, serie e note del blocco attivo." },
      { property: "og:title", content: "Modifica blocco · SERIE" },
      {
        property: "og:description",
        content: "Scheda modificabile con risultati storici conservati.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EditBlock,
});
function EditBlock() {
  const { state, update, ready, saveError } = useTraining();
  const navigate = useNavigate();
  const active = state.blocks.find((b) => b.id === state.activeBlockId);
  if (!ready) return <p className="text-muted">Caricamento scheda…</p>;
  if (!active)
    return (
      <div className="empty-state">
        <h2>Nessun blocco attivo</h2>
        <Button asChild>
          <Link to="/">Allenamento</Link>
        </Button>
      </div>
    );
  const draft =
    state.editorDraft?.mode === "edit" && state.editorDraft.block.id === active.id
      ? state.editorDraft.block
      : active;
  return (
    <div className="content-narrow import-review">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} />
        Allenamento
      </Link>
      <PageHeading title="Modifica blocco" />
      <p className="notice">
        Le modifiche valgono per gli allenamenti successivi. La sessione in corso e quelle concluse
        conservano la scheda originale.
      </p>
      <BlockEditor
        block={draft}
        onChange={(block) =>
          update((s) => ({
            ...s,
            editorDraft: { mode: "edit", block, source: "", imported: false },
          }))
        }
        fixedActions={
          <div className="import-dock-actions items-center">
            <span className="tiny text-muted" role="status">
              {saveError ? "Salvataggio non riuscito" : "Bozza salvata"}
            </span>
            <Button
              disabled={!validBlock(draft)}
              onClick={() => {
                update((s) => saveBlock(s, draft));
                void navigate({ to: "/" });
              }}
            >
              <Check />
              Salva blocco
            </Button>
          </div>
        }
      />
      {!validBlock(draft) && (
        <p className="error-message">
          Completa tutte le giornate, i nomi e le ripetizioni. Serie: da 1 a 12.
        </p>
      )}
    </div>
  );
}
