# Affitti Studenti 2.1.1 – struttura dei file

L'app non è più un unico file e **non usa cartelle**: `index.html` carica `main.js`, che importa gli altri moduli (moduli ES del browser, nessuna compilazione).
**Va servita da un sito** (GitHub Pages, o in locale `python3 -m http.server`): aprendo `index.html` con doppio clic dal disco i moduli non si caricano.

| File | Contenuto |
| --- | --- |
| `index.html`, `app.css` | pagina e stili |
| `sw.js` | funzionamento offline: **elenca tutti i file**; aggiungendo un modulo va aggiunto anche qui e cambiato il nome della cache |
| `main.js` | avvio, accesso, registrazione del service worker |
| `menu.js` | elenco dei menù e navigazione |
| `state.js` | stato condiviso (`st.*`, `SORT`, `SYNC`) |
| `util.js` | selettore `$`, formati di date e importi, versione (`APP_VERSION`) |
| `ui.js` | componenti comuni: etichette colorate, ordinamento, finestra file |
| `schema.js` | tabelle, campi, obblighi, legami (`S`, `TABLES`, `COLS`, `REQ`, `FK`) |
| `db.js` | database locale (IndexedDB) e metadati |
| `rules.js` | regole: controlli, ripartizioni, canoni, caparre |
| `api.js` | motore locale che simula le API |
| `backup.js` | esportazione e ripristino |
| `cloud-supabase.js`, `cloud-sync.js` | accesso a Supabase e sincronizzazione per record |
| `cloud-whatsapp.js` | logica dell'invio WhatsApp |
| `lib-pdf.js` | generatore di PDF |
| `views-dashboard.js` | menù Dashboard |
| `views-charts.js` | menù Grafici |
| `views-dues.js` | menù Canoni |
| `views-entities.js` | elenco e modulo generici: Appartamenti, Camere, Inquilini, Contratti, Spese |
| `views-expenses.js` | ripartizione e incassi delle Spese |
| `views-attachments.js` | allegati delle Spese |
| `views-deposits.js` | menù Caparre |
| `views-report.js` | menù Report e PDF |
| `views-settings.js` | menù Impostazioni (account, sincronizzazione, WhatsApp) |

## Altre cartelle dello zip (non vanno su GitHub)

Lo zip ha tre cartelle: `sorgenti` (questi file), `database` e `manuali`.

| File | Contenuto |
| --- | --- |
| `001_supabase_init.sql`, `002_tabelle.sql`, `003_whatsapp.sql`, `004_trasferimento_caparra.sql` | script del database, da eseguire in ordine in Supabase (SQL Editor) |
| `send-whatsapp-index.ts`, `send-whatsapp-handler.js` | funzione di invio WhatsApp (Edge Function) |
| `Manuale-Affitti-Studenti-2.1.1.docx`, `Dettaglio-modifica-2.1.1.docx` | manuale e dettaglio della modifica |
