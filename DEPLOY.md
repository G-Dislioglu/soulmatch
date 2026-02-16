# Soulmatch — Render Deployment

## Architektur

- **Client**: Vite React App → baut nach `client/dist`
- **Server**: Express → liefert `client/dist` statisch aus + `/api/studio` Proxy zu OpenAI
- **Produktion**: 1 Render Web Service, 1 URL, kein CORS

## Voraussetzungen

- Node.js 20+
- pnpm
- OpenAI API Key

## Lokale Entwicklung

```bash
# Terminal 1: Server (Port 3001)
cd server && pnpm install && pnpm dev

# Terminal 2: Client (Port 5173, proxied /api → 3001)
cd client && pnpm install && pnpm dev
```

Erstelle `.env` im Root mit `OPENAI_API_KEY=sk-...`

## Render Deployment

### 1. Neuen Web Service erstellen

- Render → **New +** → **Web Service**
- GitHub Repo verbinden

### 2. Build & Start Commands

| Feld            | Wert                                                                                  |
|-----------------|---------------------------------------------------------------------------------------|
| **Environment** | Node                                                                                  |
| **Build Command** | `cd client && npm install -g pnpm && pnpm install && pnpm build && cd ../server && pnpm install && pnpm build` |
| **Start Command** | `node server/dist/index.js`                                                          |

### 3. Environment Variables

| Variable         | Wert              |
|------------------|-------------------|
| `OPENAI_API_KEY` | `sk-...`          |
| `PORT`           | `10000` (Render default) |

### 4. Deploy

Render baut automatisch bei jedem Push. Nach dem Deploy:
- Frontend erreichbar unter der Render-URL
- Studio mit LLM: Einstellungen → Provider=OpenAI → LLM aktiviert → Studio öffnen

## Verifizierung

1. Öffne die Render-URL → Soulmatch lädt
2. Profil anlegen → Score berechnen → Report sichtbar
3. Einstellungen → Provider=OpenAI, LLM=true
4. Studio → Frage eingeben → LLM-Antworten (meta.engine = "llm")
5. Falls API-Key fehlt: Stub fallback mit Warning

## Astro Calc MVP (PR2) Verifizierung

```bash
curl -X POST https://<host>/api/astro/calc \
  -H "Content-Type: application/json" \
  -d '{"birthDate":"1990-01-01","birthTime":null,"birthPlace":null,"timezone":null,"unknownTime":true}'
```

Erwartung:
- `status = "ok"`
- `meta.engine = "swiss_ephemeris"`
- `planets.sun.lon` ist eine Zahl

Optionaler Probe-Check:

```bash
curl "https://<host>/api/astro/probe?date=1990-01-01"
```

Regression-Gate (lokal/CI gegen Ziel-URL):

```bash
cd server
ASTRO_BASE_URL=https://<host> pnpm astro:probe
```
