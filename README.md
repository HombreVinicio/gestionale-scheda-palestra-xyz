# SERIE · Allenamenti in palestra

App in italiano per il telefono con numero di giornate modificabile, registrazione delle serie, storico e backup.

## Dati e privacy

Le modifiche sono salvate immediatamente nel localStorage del browser. Non ci sono account o invio di risultati online. I dati non si sincronizzano tra dispositivi o domini: esporta un backup prima di cambiare browser o hosting. I backup JSON contengono i risultati e vanno conservati privatamente. Le sessioni iniziali DEMO sono esempi; le nuove sessioni sono personali.

I PDF con testo vengono letti localmente nel browser, senza inviare o salvare il documento. Si importano soltanto gli esercizi delle tabelle delle giornate e le note della stessa riga. Tutto il testo esterno viene ignorato, comprese FAQ, introduzioni, note generali e attività accessorie. I PDF scansionati non hanno OCR: la scheda va inserita manualmente. «Prova senza PDF» resta dimostrativo. Note coach e personali sono inseribili manualmente a livello di blocco, giornata, esercizio e serie. «Modifica blocco» salva una bozza locale e applica la scheda agli allenamenti successivi; ogni sessione conserva una copia indipendente della scheda all’inizio dell’allenamento. I dati precedenti vengono aggiornati senza perdere risultati. Non inserire PDF, backup, credenziali o risultati personali nella repository pubblica. Il workflow pubblica solo l’output del sito.

### Revisione delle schede PDF

Il lettore ricostruisce celle e testo multilinea usando la geometria del documento e identifica le colonne dalle intestazioni (italiane o inglesi), anche in ordine diverso. I nomi degli esercizi e i conteggi non sono predefiniti. Le colonne di registrazione `SET N.1` ecc. non determinano le serie. Tabelle continuate possono mantenere la giornata precedente quando intestazioni o celle allineate ne confermano la struttura. Tabelle senza bordi sono riconosciute con intestazioni e righe semplici; strutture non riconosciute restano nel testo da verificare.

Top set e back-off conservano ruoli e range per serie, separati dai risultati. I range con `/` vengono normalizzati; le notazioni non riconosciute delle righe delle tabelle restano originali e segnalate. Ripetizioni mancanti rimangono vuote nella bozza e devono essere completate prima dell’attivazione. Il testo originale resta consultabile per ogni esercizio. I buffer distinti nella stessa cella richiedono verifica dell’ordine. Le attività e note dei blocchi già salvati vengono conservate, ma non sono più generate dall’importazione. Tutti i dati entrano nel backup e le prescrizioni per serie nelle copie storiche delle sessioni.

«Allenamenti a settimana» aggiunge giornate vuote A–Z. Ridurre il numero richiede la scelta delle giornate e della destinazione degli esercizi (spostamento o eliminazione dalla scheda), con conferma. Le lettere superstiti restano stabili per non confondere sessioni e confronti. Il ciclo segue l’ordine della scheda e dopo l’ultima giornata passa alla settimana successiva, senza vincoli di calendario.

## Sviluppo

```sh
bun install
bun run dev
bun run test
```

React, TanStack Start/Router, TypeScript e Tailwind CSS. `bun run build` mantiene la pubblicazione Lovable.

## GitHub Pages

1. Nella repository collegata verifica che gli aggiornamenti arrivino su `main`. GitHub Pages funziona con repository pubbliche; per repository private serve un piano GitHub che lo supporti.
2. In GitHub apri **Settings → Pages → Source → GitHub Actions**.
3. Avvia **Pubblica SERIE su GitHub Pages** dalla scheda Actions, oppure aggiorna `main`. Se il ramo principale ha un altro nome, aggiorna il filtro nel workflow.

La configurazione dedicata `vite.pages.config.ts` genera un’app solo browser in `dist-pages`, senza importare il server di TanStack Start. Il workflow rileva automaticamente il percorso della repository (anche `/` per un sito utente o un dominio personalizzato). Risorse, favicon e navigazione usano lo stesso percorso. La compilazione genera un `index.html` per ogni schermata statica: apertura diretta e aggiornamento non richiedono un server o riscritture. Include anche `404.html` e `.nojekyll`. Il workflow esegue i test e pubblica solo `dist-pages`, a ogni push su `main` o avvio manuale.

La versione statica usa un documento HTML dedicato, senza il documento server di Start; la versione Lovable resta invariata. Schede, note, storico, avanzamento e sessione in corso rimangono nel localStorage del browser. La compilazione e il caricamento su GitHub non leggono né includono questi dati. Il sito include solo la scheda e le sessioni dimostrative iniziali. Non inserire dati privati nei sorgenti o in `public/`. La gestione delle esclusioni Git è controllata da Lovable: se aggiungi file privati, configura su GitHub le esclusioni per `*.pdf`, `serie-backup-*.json`, `.env*`, `backups/` e `personal-data/` prima di aggiungerli alla repository. Un’esclusione non rimuove file già salvati nella cronologia.

### PDF su GitHub Pages

L’importazione utilizza PDF.js e il suo worker compilati insieme all’app, caricati dallo stesso sito quando scegli il file. Non usa servizi esterni, account, chiavi o backend; il documento viene letto in memoria sul dispositivo e non viene inviato online. Resta funzionante su Pages. I PDF scansionati senza testo richiedono inserimento manuale: non è presente OCR. Google Fonts carica solo i caratteri e non interviene nell’importazione dei PDF.

### Passaggi manuali su GitHub

- Apri **Settings → Pages → Build and deployment → Source → GitHub Actions**.
- Verifica che **Settings → Actions → General** consenta GitHub Actions e le azioni del workflow; eventuali regole dell’organizzazione o approvazioni dell’ambiente `github-pages` devono consentire la pubblicazione.
- Controlla **Pubblica SERIE su GitHub Pages** in **Actions** e apri l’URL indicato al termine. Non servono segreti GitHub aggiuntivi: le autorizzazioni Pages e il token temporaneo sono già configurati.
- Se il ramo principale non è `main`, cambia il filtro `on.push.branches` nel workflow.
- Prima di passare dall’anteprima Lovable al nuovo indirizzo GitHub, usa **Esporta backup**, poi **Importa backup** sul nuovo sito: la memoria del browser non si trasferisce fra indirizzi diversi. Non cancellare i dati del browser senza un backup.

Per preparare manualmente l’output sotto una repository:

```sh
PAGES_BASE_PATH=/nome-repository/ bun run build:pages
```

Verifica locale completata sotto `/serie-check/`: compilazione statica riuscita, 37 test superati, tutte le schermate aperte direttamente e aggiornate, sessione B recuperata dopo la riapertura del browser, backup esportato/importato con conferma e PDF importato con worker locale senza richieste esterne. L’attivazione di Pages e la verifica sul sito GitHub effettivo richiedono accesso alle impostazioni della repository e restano da completare su GitHub.
