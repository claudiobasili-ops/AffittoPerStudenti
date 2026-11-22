# Affitti Studenti 2.3.7 – struttura dei file

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
| `views-finance.js` | menù Finanza: rendimento lordo e netto, cash flow, tasso di occupazione, resa per mq, simulazione |
| `views-settings.js` | menù Impostazioni (account, sincronizzazione, WhatsApp) |

## Altre cartelle dello zip (non vanno su GitHub)

Lo zip ha tre cartelle: `sorgenti` (questi file), `database` e `manuali`.

| File | Contenuto |
| --- | --- |
| `001_supabase_init.sql`, `002_tabelle.sql`, `003_whatsapp.sql`, `004_trasferimento_caparra.sql`, `005_cedolare_ricorrenti.sql`, `006_investimento_mutuo.sql`, `007_date_investimento.sql` | script del database, da eseguire in ordine in Supabase (SQL Editor) |
| `send-whatsapp-index.ts`, `send-whatsapp-handler.js` | funzione di invio WhatsApp (Edge Function) |
| `Manuale-Affitti-Studenti-2.3.7.docx`, `Dettaglio-modifica-2.3.7.docx` | manuale e dettaglio della modifica |

## Novità 2.3.0

- Ordinamento con clic sulle intestazioni anche in Spese, Caparre, Contratti, Appartamenti, Camere e Inquilini (clic: crescente, di nuovo: decrescente, terzo clic: ordine predefinito).
- Spese: filtro «Solo spese inquilini» / «Solo spese locatore»; griglia a tutta larghezza con caratteri più piccoli.
- Tipologie di spesa: «Rata mutuo», «Manutenzione ordinaria» e «Manutenzione straordinaria». La vecchia «Manutenzione» diventa «Manutenzione ordinaria» all'avvio (le spese collegate restano collegate).
- Scheda Appartamento: sezioni «Investimento» e «Mutuo» (solo nel modulo, non in griglia). Della rata basta indicare due valori su tre: il terzo è calcolato.
- Nuovo menù Finanza, con filtri per appartamento e anno.
- **Con la sincronizzazione attiva eseguire prima `006_investimento_mutuo.sql`** in Supabase.

## Novità 2.3.1

- Scheda Appartamento: ogni voce dell'investimento ha la sua data. Nel menù Finanza una voce conta solo se la data è nell'anno selezionato o prima (senza data: sempre).
- Nuova tipologia di spesa «IMU»: nel menù Finanza è conteggiata tra le tasse.
- **Con la sincronizzazione attiva eseguire prima `007_date_investimento.sql`** (e `006_investimento_mutuo.sql`, se non già fatto) in Supabase.

## Novità 2.3.2

- Spese ricorrenti: la serie si crea anche rendendo ricorrente una spesa già inserita (✎ → «Spesa ricorrente» → Salva). Le spese rimaste come riga unica si sistemano riaprendole e salvandole.

## Novità 2.3.3

- Riga «Totale» in fondo alle liste di Canoni, Spese e Contratti (somma le sole righe mostrate: segue filtri e ricerca).
- Spese: filtro per tipologia.

## Novità 2.3.4

- Dashboard: la sezione «Spese da incassare» mostra solo le quote con scadenza entro la fine del mese scelto (comprese le scadute).

## Novità 2.3.5

- Finanza: pulsante «Simulazione» (tutti i canoni dell'anno incassati, con la cedolare; spese del locatore dei mesi futuri già registrate o, se mancano, come nello stesso mese dell'anno precedente). Valori simulati in viola, mesi simulati a righe nel grafico.

## Novità 2.3.6

- Dashboard e Grafici: nel «Totale da incassare ad oggi» le spese non scadute sono solo quelle con scadenza entro la fine del mese in corso; le successive sono indicate a parte e non entrano nel totale.

## Novità 2.3.7

- Spese: filtro per mese della scadenza (‹ ›, «Tutti i mesi»), come nei Canoni; all'apertura il mese corrente.
