# Phase 1 Spec Hardened

Stand: 2026-04-24
Status: review-ready, not implemented
Owner: Builder / Opus / Internal Architect lane

## Zweck

Diese Datei ersetzt keinen bereits live vorhandenen Phase-1-Code, sondern
liefert die korrigierte, umsetzbare Fassung fuer den naechsten engen Block:

- AICOS-Meta-Loader
- Assumption-Registry
- sauberer Anschluss an das bereits live vorhandene Spec-Hardening

Der Block bleibt absichtlich eng. Er baut keine neue Governance-Architektur,
keine neue Maya-Runtime und keinen Bluepilot-Parallelpfad. Er erweitert nur den
bestehenden Builder-Eingabepfad so, dass externer Text spaeter nicht ungehaertet
in Worker-Instruktionen landet.

## Repo-sichtbare Ausgangslage

Zum Zeitpunkt dieser Spec gilt:

- `hardenInstruction(instruction)` existiert bereits in
  `server/src/lib/specHardening.ts`.
- `orchestrateTask(...)` haertet aktuell nur das eingehende
  `input.instruction` vor Scope, Swarm und Judge.
- Eine echte Meta-Loader- oder Assumption-Registry-Runtime existiert noch
  nicht.
- `builderControlPlane.ts` fuehrt bereits `openAssumptions`, aber nur als
  internen Kontrollzustand, nicht als persistente Registry mit eigener
  Provenance oder eigener Dispatch-Logik.

Diese Spec definiert daher nicht "noch ein weiteres Gate", sondern die
fehlenden Kanten, an denen kuenftiger Phase-1-Text in den bestehenden Builder-
Pfad eintritt.

## Nicht-Ziele

Nicht Teil dieses Blocks:

- keine neue Route fuer allgemeine Bluepilot-Governance
- keine Maya-Core-Integration als eigener Control-Layer
- keine AICOS-Vollintegration als normativer Orchestrator
- keine semantische Bewertung per LLM im Hardening
- keine stillen Umbauten an Scope, Claim-Gate, Judge oder Push

## Zielbild

Phase 1 fuegt genau zwei neue Textquellen in den Builder ein:

1. HTTP-geladene Meta-Fragmente aus einer spaeteren AICOS-/Spec-Quelle
2. explizit registrierte Assumptions als wiederverwendbare Kurztexte

Beide Quellen duerfen spaeter fuer Worker-Kontext genutzt werden, aber nur
unter einem expliziten Sicherheitsvertrag:

- jede Quelle hat eine eigene Trust-Boundary
- jede Quelle traegt Provenance-Felder
- jede Quelle hat eigene Laengenregeln
- jede finale Worker-Instruktion durchlaeuft vor Dispatch zwingend ein
  Hardening-Gate

## Trust Boundaries

Phase 1 fuehrt vier unterschiedliche Textklassen ein. Diese Klassen duerfen
nicht sprachlich oder technisch ineinanderfallen.

### 1. User Instruction

Herkunft:
- direkte Builder-Eingabe des Users

Vertrauen:
- untrusted

Aktueller Schutz:
- bereits durch `hardenInstruction(input.instruction)` am Anfang des
  Orchestrators abgedeckt

### 2. HTTP Meta Source

Herkunft:
- per HTTP geladene Meta-Karte, Registry-Seite oder Spec-Fragment

Vertrauen:
- untrusted external text

Regel:
- darf gespeichert, angezeigt und fuer Auswahl vorbereitet werden
- darf nicht roh in einen Worker-Prompt uebernommen werden

### 3. Assumption Entry

Herkunft:
- explizit registrierter Kurztext, abgeleitet aus User-Intent, Review oder
  Builder-Control-Plane

Vertrauen:
- trusted-for-storage, not trusted-for-dispatch

Regel:
- darf persistiert werden, wenn Validierung und Provenance vorhanden sind
- ist fuer spaetere Wiederverwendung vorgesehen
- muss vor Dispatch erneut gehaertet werden, wenn sie in einen Worker-Prompt
  eingeht

### 4. Final Dispatch Instruction

Herkunft:
- zusammengesetzter Text aus User Instruction, Scope-Kontext, Meta-Fragmenten,
  Assumptions und Builder-Systemtext

Vertrauen:
- execution-adjacent, highest risk

Regel:
- ohne erfolgreiches Dispatch-Hardening kein Worker-Dispatch

## Kernentscheidung

Die Phase-1-Spec entscheidet sich bewusst gegen zwei falsche Extreme:

1. HTTP-Text sofort wie eine verbotene Instruktion behandeln
2. HTTP-Text oder Assumptions ungehindert bis zum Worker durchreichen

Stattdessen gilt:

- beim Fetch oder Erfassen: normalisieren, validieren, Provenance anhaengen,
  Quelle klassifizieren
- beim Wiederverwenden: Quelle und Grenzen erneut pruefen
- beim finalen Dispatch: die voll zusammengesetzte Worker-Instruktion haerten

Das ist absichtlich strenger als reines Storage-Validation, aber enger als ein
ueberdefensiver Komplett-Block auf jeden externen Text.

## Dispatch-Gate

Der wichtigste neue Vertrag dieser Spec ist ein zweites Hardening-Gate direkt
an der letzten Grenze vor dem Worker.

### Pflichtregel

Jede finale Worker-Instruktion, die aus mehreren Textquellen zusammengesetzt
wurde, muss vor Dispatch durch ein verpflichtendes Hardening laufen.

### Konsequenz

Wenn dieses Gate blockierende Findings liefert:

- kein Worker-Dispatch
- Task endet vor Swarm oder vor dem betroffenen Worker-Schritt mit Fehlerstatus
- Findings werden sichtbar in der Phase protokolliert

### Wichtige Klarstellung

Das bestehende Eingangs-Hardening auf `input.instruction` bleibt erhalten,
reicht aber fuer Phase 1 nicht aus. Der neue Vertrag lautet daher:

- Eingang haerten
- zusammengesetzte Final-Instruktion erneut haerten

Nur so wird verhindert, dass spaeter geladene Meta-Fragmente oder registrierte
Assumptions den Schutz still umgehen.

## Provenance-Felder

Jeder Meta- oder Assumption-Baustein, der ueber Phase 1 eingefuehrt wird, muss
mit Provenance gespeichert oder weitergereicht werden.

Minimaler Datensatz pro Fragment:

```ts
type SourceKind = 'user' | 'http_meta' | 'assumption';

interface ProvenanceFragment {
  id: string;
  sourceKind: SourceKind;
  sourceLabel: string;
  sourceUri?: string;
  collectedAt: string;
  collectedBy: 'builder' | 'maya_brain' | 'system';
  contentLength: number;
  truncated: boolean;
  normalized: boolean;
  hardeningStatus: 'not_run' | 'warn' | 'blocked' | 'ok';
  hardeningFindingCodes: string[];
  reuseAllowed: boolean;
}
```

### Zusatzregeln

- `sourceUri` ist fuer HTTP-Meta-Pfade Pflicht, sofern eine URL vorliegt
- `reuseAllowed` darf nur true sein, wenn die Quelle die Phase-1-Validierung
  bestanden hat
- `hardeningStatus` auf Quellenebene ersetzt nicht das finale Dispatch-Hardening
- Truncation muss explizit markiert werden, nie still erfolgen

## Length-Limits pro Quelle

Die bereits live vorhandene Hardening-Grenze von 50000 Zeichen bleibt als harte
oberste Notbremse bestehen. Phase 1 fuehrt darunter engere Quellgrenzen ein.

### User Instruction

- Soft limit: 12000 Zeichen
- Hard behavior: ueber Limit kein stilles Kuetzen; Task soll frueh mit
  erklaerbarer Fehlermeldung scheitern oder in kleinere Bloecke zerlegt werden

### HTTP Meta Source

- Fetch limit pro Dokument: 12000 Zeichen
- Reuse limit pro ausgewaehltem Fragment: 4000 Zeichen
- Hard behavior: bei groesseren Quellen nur explizit normalisierte,
  abgeschnittene Teilfragmente weiterreichen

### Assumption Entry

- Limit pro Eintrag: 1000 Zeichen
- Zielgroesse: 140 bis 400 Zeichen
- Hard behavior: keine langen Essay-Assumptions; ueber Limit scheitert das
  Registrieren des Eintrags

### Final Dispatch Instruction

- Soft limit: 20000 Zeichen
- Hard limit: bestehende globale 50000 Zeichen aus `specHardening.ts`
- Hard behavior: ueber Soft limit muss die Assembly zuvor reduzieren, bevor der
  Worker aufgerufen wird

## Validierungsvertrag pro Quelle

### HTTP Meta Source

Beim Laden oder Normalisieren:

- Quelle und URI pruefen
- Zeichenlaenge begrenzen
- rohe HTML-, Script- oder offensichtliche Injection-Muster markieren
- Fragment in plain text oder engen Extrakt ueberfuehren
- Provenance schreiben

Wichtig:

- Das ist noch nicht das finale Dispatch-Hardening
- Es ist eine Quellvalidierung fuer spaetere Wiederverwendung

### Assumption Entry

Beim Anlegen:

- Text nicht leer
- unter 1000 Zeichen
- keine Multi-Paragraph-Essays
- einfache harte Pattern-Pruefung gegen offensichtliche Injection- oder
  Exfiltrationsmuster
- Provenance und Ersteller markieren

Wichtig:

- `addAssumption(text)` muss validieren und markieren
- `addAssumption(text)` allein macht den Text nicht dispatch-sicher
- sobald eine Assumption spaeter in einen Worker-Prompt eingeht, greift erneut
  das Dispatch-Gate auf die gesamte Final-Instruktion

## Assembly-Reihenfolge

Phase 1 soll beim spaeteren Bauen in dieser Reihenfolge arbeiten:

1. User-Instruction annehmen und bestehendes Eingangs-Hardening laufen lassen
2. optionale HTTP-Meta-Quellen laden und normalisieren
3. optionale Assumptions registrieren oder abrufen
4. Provenance fuer alle wiederverwendeten Fragmente an den Assembly-Kontext
   haengen
5. finale Worker-Instruktion zusammensetzen
6. Dispatch-Hardening auf die vollstaendige Final-Instruktion laufen lassen
7. nur bei `ok === true` an Worker uebergeben

## Fehlerverhalten

### Quellenfehler

Wenn eine HTTP-Quelle oder eine Assumption die Quellvalidierung nicht besteht:

- die Quelle wird verworfen oder als nicht wiederverwendbar markiert
- der gesamte Task muss nicht automatisch scheitern, solange die Final-Assembly
  ohne diese Quelle moeglich bleibt

### Dispatch-Fehler

Wenn die finale Worker-Instruktion das Dispatch-Gate nicht besteht:

- der betroffene Worker-Lauf scheitert hart
- kein stiller Fallback auf ungehaertete Final-Instruktion
- Findings muessen sichtbar im Result oder Phase-Detail landen

## Akzeptanzkriterien

Diese Spec gilt als korrekt umgesetzt, wenn alle folgenden Punkte erfuellt sind:

1. Kein HTTP-Meta-Text gelangt roh in eine Worker-Instruktion.
2. Kein Assumption-Text gelangt ohne Provenance in die Registry.
3. Keine finale Worker-Instruktion wird ohne Dispatch-Hardening abgeschickt.
4. Quellen haben unterschiedliche Limits und werden nicht ueber denselben
   pauschalen Vertrag abgewickelt.
5. Blockierende Findings stoppen den Dispatch vor Worker oder Swarm.
6. Warnungen und Block-Codes bleiben im Task-Ergebnis sichtbar.

## Empfohlene enge Implementierungsreihenfolge

Wenn diese Spec spaeter gebaut wird, dann in genau dieser Reihenfolge:

1. Typen fuer Provenance und Source-Klassen definieren.
2. Quellvalidierung fuer HTTP-Meta-Fragmente einfuehren.
3. `addAssumption(text)` mit Validation + Provenance einfuehren.
4. Final-Assembly-Schritt mit verpflichtendem Dispatch-Gate einfuehren.
5. Erst danach kleine Beobachtbarkeit fuer Findings und Truncation ergaenzen.

## Warum diese Fassung von der frueheren Richtung abweicht

Diese korrigierte Fassung zieht eine klare Lehre aus dem bereits live vorhandenen
Spec-Hardening:

- Hardening nur am User-Eingang ist fuer Phase 1 zu schwach.
- Hardening schon beim blossen Fetch von externem Text ist zu grob.
- Der richtige Ort fuer den harten Schutz ist die Grenze vor dem Worker-
  Dispatch.

Damit bleibt Phase 1 eng, aber schliesst genau die neue Sicherheitsluecke, die
durch Meta-Loader und Assumption-Registry sonst entstehen wuerde.