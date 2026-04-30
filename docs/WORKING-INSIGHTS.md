# Working Insights

## Zweck

Dieses Dokument sammelt laufende, knappe Arbeitsbeobachtungen, die fuer die
naechsten Soulmatch-Bloecke relevant sein koennen, aber noch nicht automatisch
volle `STATE.md`-, `FEATURES.md`- oder `RADAR.md`-Wahrheit sind.

Es ist:

- ein Arbeitsjournal fuer relevante neue Erkenntnisse
- ein Rueckgriffspunkt fuer naechste Builder-, Review- oder Research-Bloecke
- ein Filter gegen Kontextverlust zwischen Tasks oder Chats

Es ist nicht:

- Ersatz fuer `STATE.md`
- Ablage fuer belanglose Notizen
- Ort fuer unbelegte Spekulation als scheinbare Wahrheit

## Update-Regel

Nach jedem relevanten Task kurz pruefen:

- Gab es neue operative, technische oder review-relevante Erkenntnisse?
- Koennen sie den naechsten Block sinnvoll beeinflussen?
- Sind sie noch nicht sauber in `STATE.md`, `FEATURES.md` oder `RADAR.md`
  aufgegangen?

Wenn ja:

- genau einen knappen Eintrag hinzufuegen
- Datum, Kontext, Befund und Relevanz nennen
- keine langen Prosa-Logs schreiben

## Eintragsformat

### YYYY-MM-DD - Kurztitel

- Kontext:
- Befund:
- Relevanz:
- Naechster Nutzen:

## Eintraege

### 2026-04-30 - K2.8i bestaetigt beide frueheren Restformen mit frischen non-dry Targets

- Kontext: Gezielter Repeatability-Block nach `K2.8g` und `K2.8h` auf dem
  gehaerteten Live-Head.
- Befund: `K2.8i` lief 2/2 gruen. `beab7c7` landete einen weiteren exakten
  Docs-Append auf `docs/archive/push-test.md`; `99d8360` landete einen
  weiteren mehrzeiligen helper create-target auf
  `docs/archive/k28i-free-class1-ops-smoke.txt`. In beiden Faellen stimmten
  `verifiedCommit`, changed-files, Scope-Cleanliness und Runtime-Head ueberein.
- Relevanz: Die fruehere K2.8a-Restoffenheit ist nicht nur punktuell geloest,
  sondern auf frischen Targets operativ wiederholt.
- Naechster Nutzen: Weitere Builder-Arbeit sollte jetzt nicht mehr dieselben
  Formen re-validieren, sondern nur ueber einen neuen engen class_1-Kandidaten
  oder ueber einen bewusst getrennten Produkt-/Runtime-Block weitergehen.

### 2026-04-30 - Preview-Hardening ist live und schliesst beide K2.8a-Restformen

- Kontext: Repo-/Live-Nachzug nach `7f95aac` plus enger non-dry-Folgeschnitt
  fuer T03 und T01.
- Befund: Die gehärtete Judge-/Snapshot-Preview ist jetzt live. Auf dieser
  Basis landete `K2.8g` den frueheren T03-Fall scope-clean auf `88e2d5a` mit
  exakt einem neuen File `docs/archive/k28a-free-class1-ops-smoke.txt`;
  direkt danach landete `K2.8h` den frueheren T01-Fall scope-clean auf
  `6e1ea41` mit exakt einem Append in `docs/archive/push-test.md`. In beiden
  Faellen matchten `verifiedCommit`, Remote-Head und Runtime-Head.
- Relevanz: Die alte K2.8a-Restfrage ist damit nicht nur erklaert, sondern
  operativ geschlossen. Der relevante Unterschied war die Evidence-
  Praesentation des alten Heads, nicht eine grundsaetzliche Sperre gegen diese
  single-file class_1-Formen.
- Naechster Nutzen: Weitere Builder-Grenzarbeit sollte nicht mehr auf T03/T01
  herumreiten, sondern nur ueber einen neuen engen Kandidaten oder ueber
  explizite Repeatability-Nachweise auf dem nun gehärteten Live-Head laufen.

### 2026-04-30 - T03-Diskrepanz ist alte Live-Preview-Fragilitaet, nicht der non-dry-Zweig

- Kontext: Repo-/Live-Truth-Recheck zu Beginn des naechsten Chats plus gezielte
  T03-Stability-Nachprobe.
- Befund: Die Live-Runtime steht weiterhin auf `385cf22`; im Orchestrator
  verzweigen `dryRun` und non-dry erst **nach** Judge und
  `workflowSimulation`. Ein direkter Live-T03-Dry-Run blockte am 2026-04-30
  zunaechst erneut mit `judgeReason`: `previews show single-line content
  without newlines`; der danach materialisierte repo-sichtbare `K2.8f`-Runner
  approvte denselben Fall am selben Tag gegen denselben Live-Head `385cf22`
  wieder als `dry_run` mit `decision=approve`. Die lokale Drift mit sichtbaren
  Newlines und laengerer Patch-Preview baut und laeuft weiter gruen
  (`pnpm build`, `pnpm tsx src/lib/opusJudge.test.ts`,
  `pnpm tsx src/lib/opusEnvelopeValidator.test.ts`, `pnpm builder:k28d`).
- Relevanz: Die offene T03-Frage ist damit noch enger geschnitten. Der
  Kernwiderspruch ist nicht primaer ein eigener non-dry-Codepfad, sondern
  oszillierende Judge-Evidence auf dem noch ungehaerteten Live-Head sogar schon
  im Dry-Run.
- Naechster Nutzen: Wenn T03 live stabil werden soll, muss der bereits lokal
  verifizierte Preview-/Snapshot-Hardening-Schnitt zuerst repo- und
  deploy-sichtbar werden; weitere Vergleichslaeufe auf `385cf22` erzeugen sonst
  hauptsaechlich neue Varianzbelege.

### 2026-04-29 - Render-DNS und Runner-Resolve-Pfad

- Kontext: Live-Verifikation und freier Builder-Run gegen Render.
- Befund: Die Shell konnte `soulmatch-1.onrender.com` lokal teils nicht direkt
  aufloesen, waehrend explizite DNS-Queries und der Runner-Mechanismus mit
  festem Resolve-IP-Pfad funktionierten.
- Relevanz: Ein fehlgeschlagener Shell-`curl` ist hier nicht automatisch
  Runtime-Ausfall. Fuer belastbare Live-Probes ist der Runner-nahe
  Resolve-Mechanismus die ehrlichere Referenz.
- Naechster Nutzen: Bei kuenftigen Live-Probes oder Hardening-Runs DNS nicht mit
  Produktfehler verwechseln; bei Bedarf direkt `--resolve` oder den
  Undici-Lookup-Pfad nutzen.

### 2026-04-29 - Repo-Truth kann hinter Commit-Message zurueckbleiben

- Kontext: K2.8b-Handoff-Aufnahme und Repo-/Live-Abgleich.
- Befund: `STATE.md` trug sichtbar alte Headerwerte, obwohl spaetere Commits
  bereits einen Header-Align behaupteten. Commit-Message und tatsaechlicher
  Dateiinhalt muessen daher weiter getrennt verifiziert werden.
- Relevanz: Fuer Builder- und Handoff-Arbeit reicht Commit-Narrativ nicht;
  Dateiinhalt bleibt Truth.
- Naechster Nutzen: Vor jedem neuen Block weiter Repo-Header, Live-Head und
  Commit-Range explizit gegeneinander pruefen.

### 2026-04-29 - K2.8c als echter freier Runtime-Run

- Kontext: Erster enger operativer Free-Run nach K2.8a/K2.8b.
- Befund: `server/src/routes/journey.ts` konnte als stateless single-file
  public-route validation case frei gruen landen (`385cf22`), live von `200`
  auf `400` kippen und den gueltigen Kontrollprobe-Body intakt lassen.
- Relevanz: Der enge freie `class_1`-Korridor ist nicht nur fuer Docs/Helper
  und alte Runtime-Beweise tragfaehig, sondern jetzt auch fuer einen echten
  operativen Runtime-Run.
- Naechster Nutzen: Der naechste Erkenntnisgewinn liegt eher in gezieltem
  Hardening der `K2.8a`-Fail-Closed-Formen als in weiterer nahezu identischer
  Corridor-Wiederholung.

### 2026-04-29 - Overnight-Arbeitsmodus

- Kontext: Nutzerwunsch nach autonomer Nachtarbeit bis zum Morgenbericht.
- Befund: Der sinnvolle Autonomiepfad bleibt ein enger Builder-Nachtmodus mit
  einem Block nach dem anderen, laufendem Truth-Sync und fortgeschriebenem
  Insight-Journal statt breiter Parallel-Scope.
- Relevanz: Die Nachtarbeit braucht nicht mehr Themenbreite, sondern mehr eng
  geschnittene, verifizierte Schritte im bestehenden Korridor.
- Naechster Nutzen: Overnight zuerst Hardening der `K2.8a`-bruechigen Formen
  pruefen; nur wenn ein anderer enger Block klar mehr Erkenntniswert hat,
  innerhalb desselben freien `class_1`-Korridors abweichen.

### 2026-04-29 - K2.8a-T03 blockiert an Judge-Preview, nicht an Scope oder Claims

- Kontext: Gezielte Dry-Run-Nachprobe fuer den drei-zeiligen
  `helper create-target` aus `K2.8a-T03`.
- Befund: Alle sechs Kandidaten waren valide, `class_1`, claim-seitig
  kompatibel und mit sauberem Create-Target; der Block kam allein daher, dass
  `previewEdit()` im Judge Whitespace kollabierte und drei Zeilen als
  einzeilige Vorschau zeigte.
- Relevanz: Der Fail-Closed-Fall war kein Scope-, Safety- oder Claim-Gate-Problem,
  sondern ein schmaler Darstellungsfehler in der Judge-Evidenz.
- Naechster Nutzen: Newline-sichtbare Judge-Preview ist ein sauber geschnittener
  Hardening-Block; derselbe Fix kann auch fuer `groesserer docs append` relevant
  sein, falls dort die Exactness-Evidenz ebenfalls an kollabierter Vorschau
  haengt.

### 2026-04-29 - K2.8a-T01 blockiert an abgeschnittener Patch-Preview

- Kontext: Live-Dry-Run-Nachprobe fuer den groesseren `docs append`-Fall aus
  `K2.8a-T01`.
- Befund: Die Patch-Kandidaten waren valide und scope-clean, wurden vom Judge
  aber mit der Begruendung blockiert, die exakte Append-Line sei in der Preview
  abgeschnitten; daneben fielen zwei Overwrite-Kandidaten erwartbar aus.
- Relevanz: Auch `T01` war damit kein Scope- oder Claim-Gate-Problem, sondern
  ein zweiter Judge-Preview-Evidence-Gap.
- Naechster Nutzen: Patch-Preview darf exakte Append-Lines nicht kuerzen; mit
  sichtbaren Newlines plus laengerer Patch-Vorschau deckt derselbe enge
  Hardening-Block jetzt beide `K2.8a`-Fail-Closed-Formen ab.

### 2026-04-29 - Preview-Fix hebt beide K2.8a-Formen im echten Local Judge an

- Kontext: Lokale Verifikation mit `judgeValidCandidates()` nach dem
  Preview-Hardening in `opusJudge.ts`.
- Befund: `grok` approvte sowohl den drei-zeiligen `helper create-target` als
  auch den exakten `docs append`-Patch, sobald die Judge-Preview sichtbare
  Newlines und ungekappte Append-Evidenz bekam.
- Relevanz: Der Hardening-Block ist nicht nur syntaktisch gruen, sondern wirkt
  auf der eigentlichen Judge-Entscheidung fuer beide offenen `K2.8a`-Formen.
- Naechster Nutzen: Naechster sinnvoller Nachweis ist ein echter Builder-Run
  oder mindestens eine orchestratornahe End-to-End-Probe auf Basis des lokalen
  Builder-Cores, bevor daraus neue Repo-Wahrheit gemacht wird.

### 2026-04-29 - Autonomie braucht Blockkette plus klares Final-Verbot

- Kontext: Korrektur eines zu frueh geschlossenen Turns trotz weiter bearbeitbarem
  Builder-Pfad.
- Befund: Autonomie scheitert weniger an fehlender Arbeit als an falscher
  Abschluss-Signalisierung; Heartbeat-Automation allein setzt keine Arbeit im
  aktuellen Turn fort.
- Relevanz: Fuer laengere autonome Phasen muss `final` bis zum echten Stopppunkt
  gesperrt sein, solange noch ein naechster enger Block ohne Rueckfrage
  bearbeitbar ist.
- Naechster Nutzen: Der Repo-Arbeitsmodus traegt jetzt einen expliziten
  Autonomie-Vertrag in `AGENTS.md`; kuenftige Nacht- oder Fokuslaeufe sollten
  daran gemessen werden.

### 2026-04-29 - Lokale E2E-Verifikation braucht verengten Worker-Swarm

- Kontext: Orchestratornahe Dry-Runs fuer die beiden `K2.8a`-Formen nach dem
  Judge-Preview-Fix.
- Befund: Der lokale Default-Swarm scheiterte nicht am Builder-Core, sondern an
  Environment-Limits (`OPENROUTER_API_KEY` fehlt, `deepseek` DNS/Transport lokal
  instabil). Mit `workers: ['grok']` liefen beide Dry-Runs im echten lokalen
  Orchestrator gruen durch.
- Relevanz: Fuer lokale Hardening-Nachweise muss zwischen Builder-Logik und
  lokaler Multi-Provider-Verfuegbarkeit sauber getrennt werden.
- Naechster Nutzen: Reproduzierbare lokale Hardening-Runs sollten bewusst eine
  verfuegbare Worker-Lane pinnen, statt den Default-Swarm still vorauszusetzen.

### 2026-04-29 - K2.8d ist jetzt als lokaler Repro-Pfad materialisiert

- Kontext: Nach den ad-hoc Dry-Runs wurde ein wiederholbarer lokaler
  Hardening-Runner fuer die beiden `K2.8a`-Formen angelegt.
- Befund: `pnpm --dir server builder:k28d` lief gruen 2/2 auf der `grok`-Lane;
  Ergebnisdatei liegt unter
  `C:/Users/guerc/OneDrive/Desktop/soulmatch/k28d-local-hardening-results.json`,
  Repo-Report unter
  `docs/BUILDER-BENCHMARK-K2.8D-LOCAL-JUDGE-HARDENING-REPORT.md`.
- Relevanz: Der lokale Hardening-Nachweis haengt nicht mehr an transienten
  Inline-Skripten, sondern ist als wiederholbarer Builder-Checkpfad konserviert.
- Naechster Nutzen: Der naechste enge Beweisblock kann jetzt gezielt fragen,
  ob und wie dieser lokale `K2.8d`-Schnitt kontrolliert in repo-/live-seitige
  Verifikation ueberfuehrt werden soll.

### 2026-04-29 - Live-Dry-Run und echter Push-Versuch sind fuer T03 noch nicht stabil deckungsgleich

- Kontext: Sicherer Live-Dry-Run `K2.8e` und anschliessender echter
  non-dry Push-Versuch fuer den mehrzeiligen Helper-Create-Target-Fall.
- Befund: `K2.8e` approvte beide frueheren `K2.8a`-Formen auf der Live-Pipeline
  im Dry-Run. Ein anschliessender echter non-dry Lauf fuer `T03` blockte
  dagegen erneut auf der bekannten Judge-Begruendung, dass die drei Zeilen nur
  als zusammengezogene Einzeile sichtbar seien.
- Relevanz: Dry-run approval auf Live ist im aktuellen Zustand noch kein
  hinreichender Push-Beweis; die Judge-Stabilitaet bleibt fuer genau diese Form
  run-to-run fragil.
- Naechster Nutzen: Der naechste ehrliche Live-Block ist nicht Korridor-Widening,
  sondern Repeatability-/Stability-Analyse derselben Form oder gezielte
  Ueberfuehrung des lokalen K2.8d-Hardening-Schnitts in echte Live-Wahrheit.
