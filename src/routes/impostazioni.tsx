import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Archive, Download, FileUp, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/app-shell";
import { ConfirmModal } from "@/components/confirm-modal";
import { useTraining } from "@/components/training-provider";
import { demoPlan, parseBackup, type TrainingState } from "@/lib/training";
export const Route = createFileRoute("/impostazioni")({
  head: () => ({
    meta: [
      { title: "Impostazioni e backup · SERIE" },
      {
        name: "description",
        content: "Gestisci blocchi e backup dei tuoi dati salvati sul dispositivo.",
      },
      { property: "og:title", content: "Impostazioni e backup · SERIE" },
      {
        property: "og:description",
        content: "I tuoi dati restano tuoi. Esporta un backup e gestisci il tuo percorso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Settings,
});
function Settings() {
  const { state, update } = useTraining();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [action, setAction] = useState<"archive" | "clean" | "restore" | null>(null);
  const [backup, setBackup] = useState<TrainingState | null>(null);
  const block = state.blocks.find((b) => b.id === state.activeBlockId);
  const exportBackup = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `serie-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Backup esportato. Conservalo in un posto sicuro: contiene i tuoi risultati.");
  };
  return (
    <div className="content-narrow">
      <PageHeading eyebrow="IL TUO SPAZIO" title="Impostazioni" />
      <section className="settings-section">
        <div className="flex items-center gap-3 mb-3 accent-text">
          <ShieldCheck size={24} />
          <h2 className="text-foreground">I tuoi dati restano tuoi.</h2>
        </div>
        <p>
          Allenamenti e schede sono salvati solo su questo dispositivo, in questo browser. Non
          vengono inviati online e non sono inclusi nei file pubblicati. Cancellando i dati del
          browser potresti perderli: esporta un backup periodicamente.
        </p>
        <div className="settings-actions">
          <Button onClick={exportBackup}>
            <Download />
            Esporta backup
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <FileUp />
            Ripristina backup
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-label="Seleziona backup"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError("");
            try {
              if (file.size > 10000000) throw new Error();
              const parsed = parseBackup(await file.text());
              setBackup(parsed);
              setAction("restore");
            } catch {
              setError("Backup non valido. Scegli un file JSON esportato da SERIE.");
            }
            e.target.value = "";
          }}
        />
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {message && (
          <div className="notice" role="status">
            {message}
          </div>
        )}
      </section>
      <section className="settings-section">
        <h2>Il blocco attivo</h2>
        <p>
          {block
            ? `${block.name}${block.demo ? " · Scheda dimostrativa" : ""}`
            : "Nessun blocco attivo"}
        </p>
        <div className="settings-actions">
          <Button asChild variant="outline">
            <Link to="/nuovo-blocco">
              <Plus />
              Nuovo blocco
            </Link>
          </Button>
          {block && (
            <Button
              variant="outline"
              disabled={Boolean(state.currentSessionId)}
              onClick={() => setAction("archive")}
            >
              <Archive />
              Chiudi blocco
            </Button>
          )}
        </div>
        {state.currentSessionId && (
          <p className="notice">
            Chiudi l’allenamento in corso prima di archiviare o cambiare il blocco.
          </p>
        )}
      </section>
      <section className="settings-section">
        <h2>Un nuovo inizio</h2>
        <p>
          Rimuovi tutti gli esempi e i risultati. Inizia con una scheda dimostrativa vuota dalla
          settimana 1, giorno A.
        </p>
        <div className="settings-actions">
          <Button variant="outline" onClick={() => setAction("clean")}>
            <Trash2 />
            Azzera i dati
          </Button>
        </div>
      </section>
      <section className="settings-section">
        <h2>
          SERIE <span className="accent-text">.</span>
        </h2>
        <p>Versione 1.0 · Il tuo ritmo, una serie alla volta.</p>
        <p className="mt-3">
          L’estrazione dei PDF è dimostrativa. Nessun documento viene letto o caricato online.
        </p>
      </section>
      {action && (
        <ConfirmModal
          title={
            action === "archive"
              ? "Chiudere il blocco?"
              : action === "clean"
                ? "Azzerare tutti i dati?"
                : "Ripristinare il backup?"
          }
          description={
            action === "archive"
              ? "La scheda e tutti i risultati resteranno consultabili nello storico. Il prossimo blocco inizierà dalla settimana 1, giorno A."
              : action === "clean"
                ? "Schede, sessioni personali ed esempi saranno rimossi da questo browser. Esporta prima un backup se vuoi conservarli."
                : "Il backup sostituirà tutti i dati su questo dispositivo. Esporta prima i dati attuali se vuoi conservarli."
          }
          confirm={
            action === "archive"
              ? "Chiudi blocco"
              : action === "clean"
                ? "Azzera dati"
                : "Ripristina"
          }
          onCancel={() => setAction(null)}
          onConfirm={() => {
            if (action === "restore" && backup) {
              update(() => backup);
              setMessage("Backup ripristinato. Schede e risultati sono disponibili.");
            }
            if (action === "archive" && block)
              update((s) =>
                s.currentSessionId
                  ? s
                  : {
                      ...s,
                      activeBlockId: null,
                      blocks: s.blocks.map((b) =>
                        b.id === block.id ? { ...b, archived: true } : b,
                      ),
                    },
              );
            if (action === "clean")
              update(() => ({
                version: 1,
                activeBlockId: "clean-block",
                blocks: [
                  {
                    id: "clean-block",
                    name: "Blocco 1",
                    demo: true,
                    archived: false,
                    plan: demoPlan(),
                  },
                ],
                sessions: [],
                currentSessionId: null,
              }));
            setAction(null);
          }}
        />
      )}
    </div>
  );
}
