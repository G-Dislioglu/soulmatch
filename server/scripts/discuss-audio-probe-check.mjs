#!/usr/bin/env node

const DEFAULT_BASE_URL = 'https://soulmatch-1.onrender.com';
const DEFAULT_PERSONA = 'maya';
const DEFAULT_VOICE = 'Aoede';
const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_ABORT_TIMEOUT_MS = 15_000;

const baseUrl = (process.env.DISCUSS_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
const personaId = process.env.DISCUSS_PERSONA ?? DEFAULT_PERSONA;
const voiceName = process.env.DISCUSS_VOICE ?? DEFAULT_VOICE;
const timeoutMs = parsePositiveInt(process.env.DISCUSS_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
const abortTimeoutMs = parsePositiveInt(process.env.DISCUSS_ABORT_TIMEOUT_MS, DEFAULT_ABORT_TIMEOUT_MS);
const allowAudioError = process.env.DISCUSS_ALLOW_AUDIO_ERROR === 'true';
const skipAbort = process.env.DISCUSS_SKIP_ABORT === 'true';

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function fail(message, details) {
  console.error(`discuss-audio-probe-check: ${message}`);
  if (details !== undefined) {
    console.error(typeof details === 'string' ? details : JSON.stringify(details, null, 2));
  }
  process.exit(1);
}

function ensure(condition, message, details) {
  if (!condition) {
    fail(message, details);
  }
}

function nowMs(startedAt) {
  return Date.now() - startedAt;
}

function decodeAudioBytes(audioUrl) {
  const commaIndex = audioUrl.indexOf(',');
  ensure(commaIndex >= 0, 'audio_url has no base64 payload', audioUrl.slice(0, 120));
  return Buffer.from(audioUrl.slice(commaIndex + 1), 'base64').length;
}

function summarizeEvent(event) {
  if (event.type === 'text') {
    return `${event.type}@${event.atMs}ms len=${event.textLength}`;
  }
  if (event.type === 'audio') {
    return `${event.type}@${event.atMs}ms bytes=${event.audioBytes} engine=${event.ttsEngineUsed ?? 'none'}`;
  }
  if (event.type === 'audio_error') {
    return `${event.type}@${event.atMs}ms`;
  }
  return `${event.type}@${event.atMs}ms`;
}

function printSummary(result) {
  const summary = [
    `typing=${result.firsts.typing ?? 'none'}ms`,
    `text=${result.firsts.text ?? 'none'}ms`,
    `audio=${result.firsts.audio ?? 'none'}ms`,
    `audio_error=${result.firsts.audio_error ?? 'none'}ms`,
    `done=${result.firsts.done ?? 'none'}ms`,
  ].join(' | ');
  console.log(`\n[${result.label}] ${summary}`);
  if (result.audio) {
    console.log(`  audio: bytes=${result.audio.audioBytes} engine=${result.audio.ttsEngineUsed} mime=${result.audio.ttsMimeType}`);
  }
  if (result.audioErrorMessage) {
    console.log(`  audio_error: ${result.audioErrorMessage}`);
  }
  if (result.textSample) {
    console.log(`  text: ${result.textSample}`);
  }
  console.log(`  events: ${result.events.map(summarizeEvent).join(', ')}`);
}

function buildPayload({ userId, message, audioMode }) {
  return {
    personas: [personaId],
    message,
    conversationHistory: [],
    appMode: 'chat',
    stream: true,
    audioMode,
    userId,
    personaSettings: {
      [personaId]: {
        voice: voiceName,
      },
    },
  };
}

function startDiscussProbe({ label, userId, message, audioMode }) {
  const startedAt = Date.now();
  const controller = new AbortController();

  let resolveTyping;
  let rejectTyping;
  const typingSeen = new Promise((resolve, reject) => {
    resolveTyping = resolve;
    rejectTyping = reject;
  });

  const resultPromise = (async () => {
    const timeoutHandle = setTimeout(() => controller.abort(`timeout:${label}`), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}/api/discuss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload({ userId, message, audioMode })),
        signal: controller.signal,
      });

      if (!response.ok) {
        fail(`${label}: HTTP ${response.status} ${response.statusText}`, await response.text());
      }
      ensure(response.body, `${label}: response body missing`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const result = {
        label,
        audioMode,
        userId,
        firsts: {
          typing: null,
          text: null,
          audio: null,
          audio_error: null,
          done: null,
        },
        counts: {
          typing: 0,
          text: 0,
          audio: 0,
          audio_error: 0,
          done: 0,
        },
        events: [],
        textSample: null,
        audio: null,
        audioErrorMessage: null,
      };

      const rememberEvent = (type, extra = {}) => {
        const atMs = nowMs(startedAt);
        result.counts[type] += 1;
        if (result.firsts[type] === null) {
          result.firsts[type] = atMs;
        }
        result.events.push({ type, atMs, ...extra });
        return atMs;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          const dataLines = chunk
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim());

          if (dataLines.length === 0) {
            continue;
          }

          let event;
          try {
            event = JSON.parse(dataLines.join('\n'));
          } catch (error) {
            fail(`${label}: failed to parse SSE JSON`, { error: String(error), chunk });
          }

          switch (event.type) {
            case 'typing': {
              rememberEvent('typing', { persona: event.persona });
              resolveTyping();
              break;
            }
            case 'text': {
              ensure(typeof event.text === 'string' && event.text.trim().length > 0, `${label}: text event missing text`, event);
              result.textSample = event.text.slice(0, 120);
              rememberEvent('text', { persona: event.persona, textLength: event.text.length });
              break;
            }
            case 'audio': {
              ensure(typeof event.audio_url === 'string' && event.audio_url.startsWith('data:audio/'), `${label}: audio event missing audio_url`, event);
              ensure(typeof event.tts_engine_used === 'string' && event.tts_engine_used.length > 0, `${label}: audio event missing tts_engine_used`, event);
              ensure(typeof event.tts_mime_type === 'string' && event.tts_mime_type.length > 0, `${label}: audio event missing tts_mime_type`, event);
              const audioBytes = decodeAudioBytes(event.audio_url);
              ensure(audioBytes > 0, `${label}: decoded audio payload is empty`, event);
              result.audio = {
                audioBytes,
                ttsEngineUsed: event.tts_engine_used,
                ttsMimeType: event.tts_mime_type,
              };
              rememberEvent('audio', {
                persona: event.persona,
                audioBytes,
                ttsEngineUsed: event.tts_engine_used,
                ttsMimeType: event.tts_mime_type,
              });
              break;
            }
            case 'audio_error': {
              ensure(typeof event.message === 'string' && event.message.trim().length > 0, `${label}: audio_error missing message`, event);
              result.audioErrorMessage = event.message;
              rememberEvent('audio_error', { persona: event.persona, message: event.message });
              break;
            }
            case 'done': {
              rememberEvent('done');
              break;
            }
            default:
              fail(`${label}: unexpected SSE event type`, event);
          }
        }
      }

      ensure(result.counts.typing >= 1, `${label}: typing event missing`, result);
      ensure(result.counts.text >= 1 || result.counts.done >= 1, `${label}: stream ended without text or done`, result);
      ensure(result.counts.done >= 1, `${label}: done event missing`, result);
      return result;
    } catch (error) {
      rejectTyping(error);
      throw error;
    } finally {
      clearTimeout(timeoutHandle);
    }
  })();

  return {
    waitForTyping: typingSeen,
    result: resultPromise,
  };
}

function assertTextOnlyRun(result) {
  ensure(result.counts.text === 1, `${result.label}: expected exactly one text event`, result);
  ensure(result.counts.audio === 0, `${result.label}: audio event must not exist for audioMode=false`, result);
  ensure(result.counts.audio_error === 0, `${result.label}: audio_error must not exist for audioMode=false`, result);
  ensure(result.firsts.typing <= result.firsts.text, `${result.label}: typing must arrive before text`, result);
  ensure(result.firsts.text <= result.firsts.done, `${result.label}: text must arrive before done`, result);
}

function assertAudioRun(result) {
  ensure(result.counts.text === 1, `${result.label}: expected exactly one text event`, result);
  ensure(result.firsts.typing <= result.firsts.text, `${result.label}: typing must arrive before text`, result);
  ensure(result.firsts.text <= result.firsts.done, `${result.label}: text must arrive before done`, result);

  if (allowAudioError) {
    ensure(result.counts.audio + result.counts.audio_error >= 1, `${result.label}: expected audio or audio_error`, result);
  } else {
    ensure(result.counts.audio === 1, `${result.label}: expected one audio event`, result);
    ensure(result.counts.audio_error === 0, `${result.label}: audio_error not allowed in strict mode`, result);
  }

  if (result.counts.audio > 0) {
    ensure(result.firsts.text <= result.firsts.audio, `${result.label}: audio must not arrive before text`, result);
    ensure(result.firsts.audio <= result.firsts.done, `${result.label}: audio must arrive before done`, result);
  }
}

function assertAbortRun(firstResult, secondResult) {
  ensure(firstResult.counts.typing >= 1, 'abort-a: typing event missing', firstResult);
  ensure(firstResult.counts.text === 0, 'abort-a: canceled round still emitted text', firstResult);
  ensure(firstResult.counts.audio === 0, 'abort-a: canceled round still emitted audio', firstResult);
  ensure(firstResult.counts.audio_error === 0, 'abort-a: canceled round emitted audio_error', firstResult);
  ensure(firstResult.counts.done === 1, 'abort-a: canceled round must still close with done', firstResult);

  ensure(secondResult.counts.text === 1, 'abort-b: second round did not emit text', secondResult);
  ensure(secondResult.counts.done === 1, 'abort-b: second round did not emit done', secondResult);
}

async function main() {
  console.log(`discuss-audio-probe-check: baseUrl=${baseUrl} persona=${personaId} voice=${voiceName} timeoutMs=${timeoutMs}`);
  console.log(`  mode: ${allowAudioError ? 'degradation-allowed' : 'strict-audio'}${skipAbort ? ' | abort-skipped' : ''}`);

  const noAudioUserId = `probe-noaudio-${Date.now()}`;
  const noAudioRun = startDiscussProbe({
    label: 'stream-noaudio',
    userId: noAudioUserId,
    message: 'Probe: Bitte antworte knapp und klar nur mit einem kurzen Satz.',
    audioMode: false,
  });
  const noAudioResult = await noAudioRun.result;
  assertTextOnlyRun(noAudioResult);
  printSummary(noAudioResult);

  const audioUserId = `probe-audio-${Date.now()}`;
  const audioRun = startDiscussProbe({
    label: 'stream-audio',
    userId: audioUserId,
    message: 'Probe: Bitte antworte mit genau einem ruhigen Satz fuer einen LiveTalk-TTS-Test.',
    audioMode: true,
  });
  const audioResult = await audioRun.result;
  assertAudioRun(audioResult);
  printSummary(audioResult);

  if (!skipAbort) {
    const abortUserId = `probe-abort-${Date.now()}`;
    const firstRun = startDiscussProbe({
      label: 'abort-a',
      userId: abortUserId,
      message: 'Probe A: Wenn ein neuer Request kommt, solltest du mich nicht mehr ausgeben.',
      audioMode: false,
    });

    await Promise.race([
      firstRun.waitForTyping,
      new Promise((_, reject) => setTimeout(() => reject(new Error('abort-a typing timeout')), abortTimeoutMs)),
    ]);

    const secondRun = startDiscussProbe({
      label: 'abort-b',
      userId: abortUserId,
      message: 'Probe B: Antworte jetzt kurz, damit die vorige Runde sauber beendet wird.',
      audioMode: false,
    });

    const [firstResult, secondResult] = await Promise.all([firstRun.result, secondRun.result]);
    assertAbortRun(firstResult, secondResult);
    printSummary(firstResult);
    printSummary(secondResult);
  }

  console.log('\ndiscuss-audio-probe-check: OK');
}

await main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});