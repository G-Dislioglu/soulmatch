# M02 Circular Dependency Check

**Datum:** 2026-04-20
**Anlass:** F12 Architecture-Digest zeigt M02_ui-kit depends_on [M06_discuss, M08_studio-chat]

**Befunde:**
- `client/src/modules/M02_ui-kit/CardMayaChat.tsx`: `import { SpeechConsentDialog } from '../M08_studio-chat/ui/SpeechConsentDialog';` — Typ: runtime
- `client/src/modules/M02_ui-kit/CardMayaChat.tsx`: `import { useLiveTalk } from '../M06_discuss/hooks/useLiveTalk';` — Typ: runtime
- `client/src/modules/M02_ui-kit/CardMayaChat.tsx`: `import { LiveTalkButton } from '../M06_discuss/ui/LiveTalkButton';` — Typ: runtime

**Bewertung:**
- Die Funde sind kein Test- oder Type-Only-Artefakt, sondern echte Runtime-Imports in einem UI-Kit-Modul.
- Damit ist `M02_ui-kit -> M08_studio-chat` ein realer zyklischer Architekturpfad, weil `M08_studio-chat` seinerseits mehrfach `../../M02_ui-kit` importiert.
- Fuer `M02_ui-kit -> M06_discuss` zeigt der aktuelle Check keinen Rueckimport von `M06_discuss` nach `M02_ui-kit`; das ist damit kein bestaetigter Zyklus, aber trotzdem eine klare Schichtverletzung, weil das UI-Kit eine Feature-Implementation direkt konsumiert.

**Empfehlung:**
- `CardMayaChat` aus `M02_ui-kit` herausziehen und in ein passenderes Feature-Modul verschieben, wahrscheinlich `M06_discuss` oder `M08_studio-chat`.
- Falls Teile davon wirklich generisch sind, nur neutrale Primitives in `M02_ui-kit` belassen und die Persona-/Audio-Komposition in einem hoeherschichtigen Modul vornehmen.
- F13-Kandidat: den Architecture-Digest-Parser spaeter zwischen Runtime- und Type-Only-Imports unterscheiden lassen. Das aendert hier aber nichts am Kernbefund, weil die drei M02-Funde echte Runtime-Imports sind.