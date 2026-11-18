# Affitti Studenti 2.0.0 – struttura dei file

L'app non è più un unico file: `index.html` carica `js/main.js`, che importa gli altri moduli (moduli ES del browser, nessuna compilazione).
**Va servita da un sito** (GitHub Pages, o in locale `python3 -m http.server`): aprendo `index.html` con doppio clic dal disco i moduli non si caricano.

| File | Contenuto |
| --- | --- |
| `index.html`, `css/app.css` | pagina e stili |
| `sw.js` | funzionamento offline: **elenca tutti i file**; aggiungendo un modulo va aggiunto anche qui e cambiato il nome della cache |
| `js/main.js` | avvio, accesso, registrazione del service worker |
| `js/menu.js` | elenco dei menù e navigazione |
| `js/state.js` | stato condiviso (`st.*`, `SORT`, `SYNC`) |
| `js/util.js` | selettore `$`, formati di date e importi, versione (`APP_VERSION`) |
| `js/ui.js` | componenti comuni: etichette colorate, ordinamento, finestra file |
| `js/schema.js` | tabelle, campi, obblighi, legami (`S`, `TABLES`, `COLS`, `REQ`, `FK`) |
| `js/db.js` | database locale (IndexedDB) e metadati |
| `js/rules.js` | regole: controlli, ripartizioni, canoni, caparre |
| `js/api.js` | motore locale che simula le API |
| `js/backup.js` | esportazione e ripristino |
| `js/cloud/supabase.js`, `js/cloud/sync.js` | accesso a Supabase e sincronizzazione per record |
| `js/cloud/whatsapp.js` | logica dell'invio WhatsApp |
| `js/lib/pdf.js` | generatore di PDF |
| `js/views/dashboard.js` | menù Dashboard |
| `js/views/charts.js` | menù Grafici |
| `js/views/dues.js` | menù Canoni |
| `js/views/entities.js` | elenco e modulo generici: Appartamenti, Camere, Inquilini, Contratti, Spese |
| `js/views/expenses.js` | ripartizione e incassi delle Spese |
| `js/views/attachments.js` | allegati delle Spese |
| `js/views/deposits.js` | menù Caparre |
| `js/views/report.js` | menù Report e PDF |
| `js/views/settings.js` | menù Impostazioni (account, sincronizzazione, WhatsApp) |
