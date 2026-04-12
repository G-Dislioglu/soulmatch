# Task: Cancel-Intent + UI Cancel-Button

## Ziel
Maya soll Tasks aktiv blockieren können (nicht nur löschen), und die Task-Liste im UI soll einen Cancel-Button pro Task haben.

## Teil 1: Cancel-Intent in builderFusionChat.ts

### Datei: `server/src/lib/builderFusionChat.ts`

**1a. Intent-Type erweitern (Zeile ~38)**
```typescript
intent: 'task' | 'status' | 'approve' | 'revert' | 'delete' | 'detail' | 'retry' | 'cancel' | 'chat';
```

**1b. Intent-Beschreibung im System-Prompt (nach dem delete-Block, Zeile ~120)**
Folgende Zeilen einfügen:
```
TASK ABBRECHEN — wenn der User sagt "cancel", "abbrechen", "stopp", "blockiere":
{"intent":"cancel","taskId":"ID oder 'latest' oder 'all_stuck'"}
- 'all_stuck' = alle Tasks die seit >10 Minuten in planning/consensus haengen
```

**1c. Handler (nach dem delete-Handler, ca. Zeile ~1010)**
Neuen Block einfügen:
```typescript
if (classified.intent === 'cancel') {
  if (classified.taskId === 'all_stuck') {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const stuck = await db
      .select({ id: builderTasks.id, title: builderTasks.title, status: builderTasks.status })
      .from(builderTasks)
      .where(
        and(
          inArray(builderTasks.status, ['planning', 'consensus', 'push_candidate']),
          lt(builderTasks.updatedAt, tenMinAgo)
        )
      );

    let count = 0;
    for (const task of stuck) {
      await db
        .update(builderTasks)
        .set({ status: 'blocked', updatedAt: new Date() })
        .where(eq(builderTasks.id, task.id));
      count += 1;
    }

    return {
      type: 'task_action',
      message: count > 0
        ? `${count} haengende Tasks blockiert.`
        : 'Keine haengenden Tasks gefunden.',
    };
  }

  const taskId = await resolveTaskId(classified.taskId);
  if (!taskId) {
    return { type: 'error', message: 'Kein Task gefunden.' };
  }

  const [task] = await db.select().from(builderTasks).where(eq(builderTasks.id, taskId));
  if (!task) {
    return { type: 'error', message: 'Task nicht gefunden.' };
  }

  if (task.status === 'done') {
    return { type: 'error', message: 'Task ist bereits abgeschlossen.' };
  }

  await db
    .update(builderTasks)
    .set({ status: 'blocked', updatedAt: new Date() })
    .where(eq(builderTasks.id, taskId));

  return {
    type: 'task_action',
    message: `Task "${task.title}" abgebrochen (blocked).`,
    taskId,
  };
}
```

**1d. Imports prüfen:** `and`, `inArray`, `lt` aus `drizzle-orm` müssen importiert sein. Prüfe ob sie schon im Import-Block stehen, sonst ergänzen.

## Teil 2: Cancel-Button im UI

### Datei: Die React-Komponente die die Task-Liste rendert (vermutlich in `client/src/`)

Zu jedem Task in der linken Sidebar einen kleinen ✕-Button hinzufügen, der nur bei Status !== 'done' sichtbar ist. onClick ruft:
```typescript
fetch(`/api/builder/opus-bridge/override/${taskId}?opus_token=opus-bridge-2026-geheim`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'block', reason: 'Manually cancelled via UI' })
})
```

Danach Task-Liste refreshen.

## Nicht tun
- Keine Änderungen am override-Endpoint (der existiert schon)
- Kein neuer DB-Status "cancelled" — wir nutzen "blocked"
- Keine Änderungen am Roundtable-Flow

## Verifikation
```bash
cd server && npx tsc --noEmit
cd client && npx tsc -b
```
