# SERIE · Allenamenti in palestra

App in italiano per il telefono con schede A–D, registrazione delle serie, storico e backup.

## Dati e privacy

Le modifiche sono salvate immediatamente nel localStorage del browser. Non ci sono account o invio di risultati online. I dati non si sincronizzano tra dispositivi o domini: esporta un backup prima di cambiare browser o hosting. I backup JSON contengono i risultati e vanno conservati privatamente. Le sessioni iniziali DEMO sono esempi; le nuove sessioni sono personali.

I PDF con testo vengono letti localmente nel browser, senza inviare o salvare il documento. Solo giornate, esercizi completi e serie esplicitamente riconosciuti vengono associati; tutte le altre righe, incluse quelle a fondo pagina, restano da verificare. I PDF scansionati non hanno OCR: la scheda va inserita manualmente. «Prova senza PDF» resta dimostrativo. Note coach e personali sono disponibili a livello di blocco, giornata, esercizio e serie. «Modifica blocco» salva una bozza locale e applica la scheda agli allenamenti successivi; ogni sessione conserva una copia indipendente della scheda all’inizio dell’allenamento. I dati precedenti vengono aggiornati senza perdere risultati. Non inserire PDF, backup, credenziali o risultati personali nella repository pubblica. Il workflow pubblica solo l’output del sito.

## Sviluppo

```sh
bun install
bun run dev
bun run test
```

React, TanStack Start/Router, TypeScript e Tailwind CSS. `bun run build` mantiene la pubblicazione Lovable.

## GitHub Pages

1. Collega il progetto a una repository GitHub pubblica.
2. In GitHub apri **Settings → Pages → Source → GitHub Actions**.
3. Avvia **Pubblica SERIE su GitHub Pages** dalla scheda Actions, oppure aggiorna `main`. Se il ramo principale ha un altro nome, aggiorna il filtro nel workflow.

La configurazione dedicata `vite.pages.config.ts` genera un’app solo browser in `dist-pages`. Il workflow rileva automaticamente il percorso della repository e copia la pagina iniziale nei percorsi di ogni schermata per l’apertura diretta. Nessun server è necessario. Il sito generato non contiene risultati locali o PDF personali.

Per preparare manualmente l’output sotto una repository:

```sh
PAGES_BASE_PATH=/nome-repository/ bun run build:pages
```

Repository e pubblicazione GitHub Pages devono essere attivate dall’account GitHub: non vengono create automaticamente. Il percorso GitHub Pages è predisposto ma non verificato su un sito GitHub effettivo.
