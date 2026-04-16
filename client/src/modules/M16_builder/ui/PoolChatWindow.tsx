import { useEffect, useRef, useState } from 'react';

import { TOKENS } from '../../../design/tokens';
import type { BuilderChatPoolEntry, BuilderTaskObservation } from '../hooks/useBuilderApi';

const POLL_MS = 2000;

interface PoolChatWindowProps {
  title: string;
  taskId: string | null;
  accent?: string;
  compact?: boolean;
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
    compact = false,
    filter,
    fetchObservation,
  } = props;
  const [collapsed, setCollapsed] = useState(true);
  const [messages, setMessages] = useState<BuilderChatPoolEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const collapsedRef = useRef(collapsed);
  const previousCountRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    collapsedRef.current = collapsed;
    if (!collapsed) {
      setUnreadCount(0);
    }
  }, [collapsed]);

  useEffect(() => {
    setCollapsed(true);
    setMessages([]);
    setLoading(false);
    setError(null);
    setUnreadCount(0);
    previousCountRef.current = 0;
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
        const previousCount = previousCountRef.current;
        previousCountRef.current = nextMessages.length;

        if (collapsedRef.current && nextMessages.length > previousCount) {
          setUnreadCount((current) => current + (nextMessages.length - previousCount));
        }

        if (!collapsedRef.current) {
          setUnreadCount(0);
        }

        setMessages(nextMessages);
        setError(null);
      } catch (pollError) {
        if (!cancelled) {
          setError(pollError instanceof Error ? pollError.message : 'Scout-Pool konnte nicht geladen werden');
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

  useEffect(() => {
    if (!collapsed) {
      bottomRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [collapsed, messages]);

  const disabled = !taskId;
  const width = compact ? 'min(100vw - 24px, 340px)' : '360px';

  return (
    <div
      style={{
        position: 'fixed',
        right: compact ? 12 : 18,
        bottom: compact ? 12 : 18,
        width,
        zIndex: 30,
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          border: `1.5px solid ${error ? '#f87171' : accent}`,
          borderRadius: 22,
          background: TOKENS.card,
          boxShadow: TOKENS.shadow.panel,
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            border: 'none',
            background: `linear-gradient(180deg, ${accent}22, rgba(255,255,255,0.03))`,
            color: TOKENS.text,
            padding: '12px 14px',
            cursor: 'pointer',
            textAlign: 'left',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {unreadCount > 0 ? (
              <span
                style={{
                  minWidth: 24,
                  borderRadius: 999,
                  border: `1px solid ${accent}`,
                  background: `${accent}22`,
                  color: TOKENS.text,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  textAlign: 'center',
                }}
              >
                +{unreadCount}
              </span>
            ) : null}
            <span style={{ fontSize: 16, color: TOKENS.text2 }}>{collapsed ? '^' : 'v'}</span>
          </div>
        </button>

        {!collapsed ? (
          <div style={{ borderTop: `1px solid ${TOKENS.b2}`, padding: 14 }}>
            <div style={{ fontSize: 12, color: TOKENS.text2, marginBottom: 10 }}>
              {loading
                ? 'Scout laedt ...'
                : error
                  ? error
                  : disabled
                    ? 'Waehle links eine Task, um Scout-Nachrichten zu sehen.'
                    : 'Scout-Findings aus dem laufenden Chat-Pool.'}
            </div>
            <div
              style={{
                maxHeight: 320,
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
                  Noch keine Scout-Nachrichten fuer diese Task.
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}