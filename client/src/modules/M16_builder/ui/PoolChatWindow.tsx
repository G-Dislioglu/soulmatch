import { useEffect, useState } from 'react';

import { TOKENS } from '../../../design/tokens';
import type { BuilderChatPoolEntry, BuilderTaskObservation } from '../hooks/useBuilderApi';

const POLL_MS = 2000;

interface PoolChatWindowProps {
  title: string;
  taskId: string | null;
  accent?: string;
  description?: string;
  emptyStateText?: string;
  maxHeight?: number;
  filter: (entry: BuilderChatPoolEntry) => boolean;
  fetchObservation: (taskId: string) => Promise<BuilderTaskObservation>;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PoolChatWindow(props: PoolChatWindowProps) {
  const {
    title,
    taskId,
    accent = TOKENS.green,
    description,
    emptyStateText,
    maxHeight = 420,
    filter,
    fetchObservation,
  } = props;
  const [messages, setMessages] = useState<BuilderChatPoolEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessages([]);
    setLoading(false);
    setError(null);
  }, [taskId]);

  useEffect(() => {
    if (!taskId) {
      return;
    }

    let cancelled = false;
    let firstLoad = true;

    const poll = async () => {
      if (firstLoad) {
        setLoading(true);
      }

      try {
        const observation = await fetchObservation(taskId);
        if (cancelled) {
          return;
        }

        const nextMessages = Array.isArray(observation.chatPool)
          ? observation.chatPool.filter(filter)
          : [];

        setMessages(nextMessages);
        setError(null);
      } catch (pollError) {
        if (!cancelled) {
          setError(pollError instanceof Error ? pollError.message : `${title}-Pool konnte nicht geladen werden`);
        }
      } finally {
        if (!cancelled && firstLoad) {
          setLoading(false);
          firstLoad = false;
        }
      }
    };

    void poll();
    const intervalId = window.setInterval(() => {
      void poll();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [fetchObservation, filter, taskId]);

  const disabled = !taskId;
  const panelDescription = description ?? `${title}-Signale aus dem laufenden Chat-Pool.`;
  const panelEmptyState = emptyStateText ?? `Noch keine ${title}-Nachrichten fuer diese Task.`;

  return (
    <div
      style={{
        border: `1.5px solid ${error ? '#f87171' : accent}`,
        borderRadius: 20,
        background: TOKENS.card,
        boxShadow: TOKENS.shadow.panel,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'center',
          padding: '12px 14px',
          borderBottom: `1px solid ${TOKENS.b2}`,
          background: `linear-gradient(180deg, ${accent}22, rgba(255,255,255,0.03))`,
        }}
      >
        <div style={{ display: 'grid', gap: 3 }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: accent, fontWeight: 700 }}>
            {title}
          </span>
          <span style={{ fontSize: 12, color: disabled ? TOKENS.text3 : TOKENS.text2 }}>
            {disabled ? 'Keine aktive Task' : `${messages.length} Nachrichten`}
          </span>
        </div>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 12, color: TOKENS.text2, marginBottom: 10 }}>
          {loading
            ? `${title} laedt ...`
            : error
              ? error
              : disabled
                ? 'Waehle links eine Task, um Pool-Nachrichten zu sehen.'
                : panelDescription}
        </div>
        <div
          style={{
            maxHeight,
            overflowY: 'auto',
            display: 'grid',
            gap: 10,
            paddingRight: 2,
          }}
        >
          {messages.map((message, index) => (
            <article
              key={`${message.createdAt}-${message.actor}-${index}`}
              style={{
                borderRadius: 16,
                border: `1px solid ${TOKENS.b2}`,
                background: 'rgba(255,255,255,0.03)',
                padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: accent, fontWeight: 700 }}>
                  {message.actor}
                </span>
                <span style={{ fontSize: 11, color: TOKENS.text3 }}>
                  {formatTimestamp(message.createdAt)}
                </span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: TOKENS.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {message.content}
              </div>
            </article>
          ))}
          {!loading && !error && !disabled && messages.length === 0 ? (
            <div style={{ borderRadius: 16, border: `1px dashed ${TOKENS.b2}`, padding: '14px 12px', fontSize: 12, color: TOKENS.text2, background: 'rgba(255,255,255,0.02)' }}>
              {panelEmptyState}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}