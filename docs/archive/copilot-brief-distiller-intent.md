# Task: Distiller Intent-Treue — User-Wortlaut bewahren

## Problem
Wenn der User "getWorstPerformers" sagt, erzeugt der Distiller Tasks für "getTopPerformers" — er überschreibt den User-Intent mit bestehendem Code-Kontext. Das ist der kritischste Bug der Pipeline.

## Ursache (Hypothese)
Der Distiller sieht im Scope `agentHabitat.ts`, findet dort `getTopPerformers`, und "korrigiert" den Funktionsnamen. Das LLM optimiert auf Konsistenz statt auf Treue zum User-Input.

## Datei: `server/src/lib/opusDistiller.ts` (oder wo der Distiller-Prompt gebaut wird)

## Fix: Wortlaut-Anker im Distiller-Prompt

Suche die Stelle wo der Distiller-Systemprompt gebaut wird. Füge folgende Zeilen am Anfang des Prompts hinzu:

```
KRITISCHE REGEL: Der User-Auftrag ist die Wahrheit.
- Funktionsnamen, Variablennamen und Parameter aus dem User-Input MÜSSEN exakt übernommen werden.
- Du darfst NICHT bestehende Funktionsnamen aus dem Code als "Korrektur" einsetzen.
- Wenn der User "getWorstPerformers" schreibt, heißt die Funktion "getWorstPerformers" — nicht "getTopPerformers".
- Bestehender Code ist KONTEXT, nicht VORLAGE. Der User-Auftrag hat Vorrang.
```

## Zusätzlich: Duplikat-Check

Im selben Distiller-Flow (nachdem der Task formuliert wurde, bevor er erstellt wird):
1. Extrahiere den Funktionsnamen aus dem Task-Goal
2. Prüfe per Regex ob dieser Name schon im Scope-File existiert (Repo-Index oder File-Content)
3. Wenn ja: Füge einen Hinweis zum Task-Goal hinzu: "ACHTUNG: Eine Funktion mit diesem Namen existiert bereits. Prüfe ob der Auftrag eine NEUE Funktion meint oder eine Änderung der bestehenden."

## Nicht tun
- Keinen neuen Endpoint
- Keine Änderung am Scout oder Council
- Keine Änderung am Worker

## Verifikation
```bash
cd server && npx tsc --noEmit
```
Dann: User gibt "getWorstPerformers" ein → prüfen ob der Task-Titel tatsächlich "getWorstPerformers" enthält.
