# RealTimeChat

Applicazione web di chat real-time realizzata con Node.js, Express, MongoDB e Socket.IO. Include registrazione e accesso degli utenti, chat e gestione del profilo.

## Requisiti

- Node.js e npm
- Un database MongoDB accessibile dall'applicazione

## Installazione

1. Clona il repository e spostati nella cartella del progetto.
2. Installa le dipendenze:

   ```bash
   npm install
   ```

3. Crea nella cartella principale un file `.env` e configura le variabili richieste:

   ```dotenv
   MONGO_URI=mongodb://localhost:27017/realtimechat
   PORT=3000
   JWT_SECRET=inserisci-una-chiave-casuale-lunga
   JWT_LIFETIME_ACCESS=15m
   JWT_LIFETIME_REFRESH=7d
   ```

   Sostituisci `MONGO_URI` con l'indirizzo del tuo database e `JWT_SECRET` con un valore casuale e riservato. Non pubblicare mai il file `.env` o le credenziali.

4. Avvia l'applicazione:

   ```bash
   npm start
   ```

   Il server si avvia sulla porta definita da `PORT` (oppure sulla porta `3000` se non è impostata). Apri `http://localhost:3000` nel browser.

## Funzionalità

- Registrazione e login
- Chat e messaggi real-time tramite Socket.IO
- Profilo utente e gestione delle chat
- Persistenza dei dati con MongoDB

## Stack

- Node.js, Express e Socket.IO
- MongoDB con Mongoose
- HTML, CSS e JavaScript

## Note

Le dipendenze JavaScript sono dichiarate in `package.json`; `package-lock.json` registra le versioni risolte. Le cartelle `node_modules/` e il file `.env` sono esclusi da Git tramite `.gitignore`.
