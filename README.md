# CNB Exchange rates app documentation

## 1. Prehled
Aplikace nacita a zobrazuje denne aktualizovane devizove kurzy z Ceske narodni banky. Server cast (Express) stahuje TXT soubor z CNB, parsuje ho do strukturovaneho JSONu a vystavuje REST endpoint. Frontend (React + Vite + React Query) data zobrazuje a umoznuje prevod castky z CZK do vybrane meny.

## 2. Architektura
- Monorepo (npm workspaces): `client/` (React) + `server/` (Express) + sdilene typy v `common/`
- Data flow: CNB TXT -> `fetch` na serveru -> parsovani -> cache pres HTTP caching headers -> FE `react-query` fetch -> zobrazeni + vypocet konverze.

## 3. Technologie
- Server: Node.js, Express, dayjs
- Frontend: React 19, Vite, React Query, styled-components
- Testy: Vitest, Testing Library, Supertest (pro server endpointy)
- Lint: ESLint

## 4. Endpointy (API Reference)
| Method | Path | Popis |
|--------|------|-------|
| GET | /api/cnb/daily | Vrati posledni denni kurzy CNB (JSON viz vyse). |
| GET | /health | Jednoduchy healthcheck `{ status: "ok", timestamp }`. |

## 5. Environment promenne
Server (Express):
- `PORT` (napr. 3003) - povinne
- `CNB_DAILY_URL` - povinne, URL na TXT denni kurzy

Client (Vite):
- `VITE_API_RATES_URL` - URL na backend `/api/cnb/daily` (napr. produkcne `https://example.com/api/cnb/daily`)

## 6. Instalace a spusteni
### 6.1. Prerekvizity
- Node.js LTS (18+)
- npm (workspaces povolene implicitne)

### 6.2. Instalace dependencies
```
npm install
```

### 6.3. Development (soubezny server + klient)
```
npm run dev
```
Spusti `client` (Vite) a `server` (Express) paralelne pres `concurrently`.

### 6.4. Samostatne
```
npm run dev:server
npm run dev:client
```

### 6.5. Build
```
npm run build
```
Vytvori produkcni build klienta a serveru.

### 6.6. Lint
```
npm run lint
```

### 6.7. Testy
Client:
```
npm test -w client
```
Server:
```
npm test -w server
```
Watch mod:
```
npm run test:watch -w client
```

## 7. Bezpecnostni aspekty
Aktualne nastavene HTTP security headers:
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Type: application/json; charset=utf-8`
- `Cache-Control: public, max-age=300`
- `Access-Control-Allow-Origin: *`

## 8. Deployment
1. Nastav env promenne (`PORT`, `CNB_DAILY_URL`, `VITE_API_RATES_URL`).
2. Spust `npm run build`.
3. Server spustit (napr. `node server/server.js` po transpilaci, pripadne bundler). Poznamka: Zde lze doplnit production process manager (PM2, Docker).
4. Klient servovat pres CDN / staticky hosting (Vite build vystup).

Reverse proxy (Nginx) doporuceni:
- Nastavit caching pro `/api/cnb/daily` (TTL ~5 minut)
- Force HTTPS + HSTS

## 9. Mozne dalsi vylepseni (backlog)
- Rate limiter (napr. `express-rate-limit`)
- Monitoring a alerting (Sentry, OpenTelemetry)
- Validace externich dat (Zod schema pro vystup + env variables)
- Implementace AbortController pro timeouty fetchu na CNB
- Dockerfile pro jednodussi nasazeni
- E2E testy (Playwright / Cypress)


## 10. Poznamky k implementaci

- CNB API ma CORS policy, nelze pouzit primo v FE. Takze co zvolit? 
    - Moznost 1: https://github.com/ccoenraets/cors-proxy
    - Moznost 2: Udelat si tiny backend v node, ktery data fetchne, vyparsuje a vrati do FE uz JSON.
    - Vyhrala moznost 2. Chci mit business logiku na backendu.
    - Jeste byla dalsi moznost - netahat data v TXT formatu z CNB na server. Mohl jsem pouzit JSON endpoint, ktery uz ma data vyparsovana. Tento endpoint: https://api.cnb.cz/cnbapi/exrates/daily?lang=EN. Endpoint jsem nepouzil, abych dodrzel zadani. Jinak bych ho pouzil, ma uz strukturovana  JSON data.