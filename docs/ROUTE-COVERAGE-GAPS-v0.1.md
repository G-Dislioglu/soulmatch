# Route Coverage Gaps v0.1

Scope: read-only audit of four handlers in `server/src/routes/studio.ts`, `server/src/routes/guide.ts`, and `server/src/routes/match.ts`.

| Route | Provider-Guard vorhanden? | Empty-Validation vorhanden? | Code-Stelle (Datei:Zeile) |
| --- | --- | --- | --- |
| `POST /studio` | Nein. `providerName` wird aus `body.provider` gecastet und direkt via `PROVIDER_CONFIGS[providerName]` aufgeloest; die Guard ist erst der nachgelagerte `if (!config)`-Check. | Nein. `studioRequest.userMessage` wird nur auf truthiness geprueft, nicht auf getrimmten non-empty Inhalt. | `server/src/routes/studio.ts:453-467` |
| `POST /discuss` | Entfaellt im angefragten Sinn. Der Handler nutzt keinen `provider` aus dem Request und ruft weder `resolveApiKey` noch `PROVIDER_CONFIGS[provider]` direkt auf; der Provider kommt ueber `getProviderForPersona(personaId)`. | Teilweise. Es gibt einen Guard fuer `personas` als nicht-leeres Array, aber keine Validierung, dass jedes Element ein nicht-leerer String ist. | `server/src/routes/studio.ts:1143-1156`, `server/src/routes/studio.ts:1256` |
| `POST /guide` | Nein. `provider` wird nur gecastet und dann sofort in `CHAT_URLS[provider]` indiziert; die Pruefung erfolgt erst ueber `if (!apiUrl)`. | Nein. `systemPrompt` und `userMessage` werden nur auf truthiness geprueft, nicht auf getrimmte non-empty Strings. | `server/src/routes/guide.ts:37-52` |
| `POST /narrative` | Entfaellt. Der Handler hat keinen Provider-Pfad und greift nicht auf Provider-Configs oder API-Key-Resolver zu. | Nein. `profileA.name` und `profileB.name` werden im Handler vor der Weiterverwendung nicht validiert; `buildMatchNarrativePayload()` uebernimmt sie direkt oder faellt nur bei `null`/`undefined` auf Platzhalter zurueck. | `server/src/routes/match.ts:453-469`, `server/src/routes/match.ts:756-763` |

## `POST /studio`

Der Handler prueft frueh nur `body.studioRequest?.userMessage`, aber ohne `trim()`, daher passieren Whitespace-Strings den Guard weiter. Beim Providerpfad wird `body.provider` nur per Cast zu `ProviderName` uebernommen; der erste echte Guard ist erst nach dem direkten Lookup `PROVIDER_CONFIGS[providerName]` ueber `if (!config)`.

## `POST /discuss`

Im angefragten Provider-Sinne liegt hier kein direkter Coverage-Gap vor, weil der Handler keinen frei uebergebenen `provider` verarbeitet, sondern pro Persona ueber `getProviderForPersona(personaId)` routet. Bei der Empty-Validation ist der Schutz nur teilweise vorhanden: Das Array `personas` muss existieren und mindestens ein Element haben, aber einzelne leere oder whitespace-only Persona-IDs werden an dieser Stelle nicht ausgeschlossen.

## `POST /guide`

Der Providerpfad ist nur schwach abgesichert: `body.provider` wird per Cast uebernommen und direkt in `CHAT_URLS[provider]` indiziert, bevor ueberhaupt gegen eine erlaubte Liste validiert wird. Fuer `systemPrompt` und `userMessage` gibt es nur einen truthy-Check; Strings wie `'   '` werden dadurch nicht abgefangen.

## `POST /narrative`

Der Handler validiert `profileA.name` und `profileB.name` nicht, bevor die Daten in `buildMatchNarrativePayload(request)` weitergereicht werden. Dort werden nur `undefined`-Faelle mit `Profil A` und `Profil B` ersetzt; ein leerer String bleibt leer und kann so direkt in den erzeugten Narrativtext einfliessen.