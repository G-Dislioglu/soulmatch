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

function formatActorLabel(actor: string) {
  if (actor === 'maya-moderator') {
    return 'MAYA';
  }

  if (actor === 'system') {
    return 'System';
  }

  return actor;
}

function getMessageStyle(message: BuilderChatPoolEntry, accent: string) {
  if (message.actor === 'maya-moderator') {
    return {
      surface: 'linear-gradient(180deg, rgba(212,175,55,0.12), rgba(167,139,250,0.10))',
      border: 'rgba(212,175,55,0.38)',
      labelColor: TOKENS.gold,
      labelBackground: 'rgba(212,175,55,0.16)',
      labelBorder: 'rgba(212,175,55,0.34)',
      metaColor: 'rgba(255,255,255,0.7)',
      textColor: TOKENS.text,
      contentSize: 13,
    };
  }

  if (message.actor === 'system') {
    return {
      surface: 'rgba(255,255,255,0.02)',
      border: TOKENS.b3,
      labelColor: TOKENS.text2,
      labelBackground: 'rgba(255,255,255,0.03)',
      labelBorder: TOKENS.b3,
      metaColor: TOKENS.text3,
      textColor: TOKENS.text2,
      contentSize: 12,
    };
  }

  return {
    surface: 'rgba(255,255,255,0.03)',
    border: TOKENS.b2,
    labelColor: accent,
    labelBackground: `${accent}16`,
    labelBorder: `${accent}33`,
    metaColor: TOKENS.text3,
    textColor: TOKENS.text,
    contentSize: 13,
  };
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
            (() => {
              const style = getMessageStyle(message, accent);

              return (
                <article
                  key={`${message.createdAt}-${message.actor}-${index}`}
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${style.border}`,
                    background: style.surface,
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      <span
                        style={{
                          borderRadius: 999,
                          border: `1px solid ${style.labelBorder}`,
                          background: style.labelBackground,
                          padding: '2px 8px',
                          fontSize: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                          color: style.labelColor,
                          fontWeight: 700,
                        }}
                      >
                        {formatActorLabel(message.actor)}
                      </span>
                      {Number.isFinite(message.round) ? (
                        <span
                          style={{
                            borderRadius: 999,
                            border: `1px solid ${TOKENS.b3}`,
                            background: 'rgba(255,255,255,0.03)',
                            padding: '2px 8px',
                            fontSize: 10,
                            color: style.metaColor,
                            fontWeight: 600,
                          }}
                        >
                          Runde {message.round}
                        </span>
                      ) : null}
                    </div>
                    <span style={{ fontSize: 11, color: style.metaColor, whiteSpace: 'nowrap' }}>
                      {formatTimestamp(message.createdAt)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: style.contentSize,
                      lineHeight: 1.6,
                      color: style.textColor,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {message.content}
                  </div>
                </article>
              );
            })()
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