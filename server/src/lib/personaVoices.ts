export function getPersonaVoice(personaId: string): string {
  const key = (personaId ?? '').trim().toLowerCase();
  const voices: Record<string, string> = {
    maya:       'Aoede',
    luna:       'Leda',
    orion:      'Orus',
    lilith:     'Kore',
    stella:     'Callirrhoe',
    kael:       'Fenrir',
    lian:       'Zephyr',
    sibyl:      'Kore',
    amara:      'Achernar',
    echo_prism: 'Puck',
  };
  return voices[key] ?? 'Kore';
}

function getAccentGuidance(personaId: string): string {
  const key = (personaId ?? '').trim().toLowerCase();
  const accentProfile = (process.env.ACCENT_PROFILE ?? 'subtle').trim().toLowerCase();
  if (accentProfile === 'off') return '';

  const subtle = accentProfile !== 'strict';
  const intensity = subtle ? 'very light' : 'noticeable but respectful';
  const map: Record<string, string> = {
    kael: `Accent Layer: Use a ${intensity} South Asian / Indian-English prosodic influence for Vedic themes. Keep it natural and never caricatured.`,
    sibyl: `Accent Layer: Use a ${intensity} Eastern Mediterranean cadence, inspired by Hellenistic numerology roots. Keep it intimate and modern.`,
    lian: `Accent Layer: Use a ${intensity} East-Asian influenced rhythm (clean consonants, gentle cadence), subtle and contemporary.`,
    orion: `Accent Layer: Keep mostly neutral, with only a slight global/continental cadence for philosophical passages.`,
  };

  return map[key] ?? '';
}

export function getPersonaVoiceDirector(personaId: string): string {
  const key = (personaId ?? '').trim().toLowerCase();
  const baseStyle = 'Speak like a real live conversation, not like reading. Vary rhythm and sentence stress naturally. Use subtle emotional color that matches the text. Keep pauses short and human.';
  const accentGuidance = getAccentGuidance(key);
  const directors: Record<string, string> = {
    maya: `Audio Profile: Weise Astrologin, Mitte 40, warm und einfühlsam.
Scene: Stilles Beratungszimmer, Kerzenlicht.
Director's Notes: ${baseStyle} Calm authority with warm empathy. Slightly slower on summaries, slightly more energetic on transitions.${accentGuidance ? ` ${accentGuidance}` : ''}`,

    luna: `Audio Profile: Mondgöttin-Persona, sanft und träumerisch.
Scene: Nächtlicher Garten, Mondlicht.
Director's Notes: Speak thoughtfully but not slowly. Soft emotional breath, flowing cadence, gentle melodic rise/fall.${accentGuidance ? ` ${accentGuidance}` : ''}`,

    orion: `Audio Profile: Kosmischer Weiser, maskulin, geerdet.
Scene: Sternwarte bei Nacht.
Director's Notes: Speak calmly and clearly. Grounded and precise, but with subtle conviction on key arguments.${accentGuidance ? ` ${accentGuidance}` : ''}`,

    lilith: `Audio Profile: Dunkle Prophetin, intensiv und direkt.
Scene: Düsteres Orakel.
Director's Notes: Speak quickly and directly. No theatrical drag. Sharp, alive, emotionally charged, with punchy emphasis.${accentGuidance ? ` ${accentGuidance}` : ''}`,

    stella: `Audio Profile: Sonnenenergetische Beraterin, warm und optimistisch.
Scene: Helles Atelier, Morgensonne.
Director's Notes: ${baseStyle} Brighter tone, encouraging energy, audible smile without sounding artificial.${accentGuidance ? ` ${accentGuidance}` : ''}`,

    kael: `Audio Profile: Astrologischer Krieger, direkt und ehrlich.
Scene: Freies Feld unter Sternenhimmel.
Director's Notes: ${baseStyle} Deep grounded tone, concise delivery, firm emphasis on core statements.${accentGuidance ? ` ${accentGuidance}` : ''}`,

    lian: `Audio Profile: Östliche Weisheitsträgerin, fließend und harmonisch.
Scene: Zen-Garten, Wassergeräusche.
Director's Notes: ${baseStyle} Fluid phrasing with elegant transitions and calm emotional softness.${accentGuidance ? ` ${accentGuidance}` : ''}`,

    sibyl: `Audio Profile: Antike Seherin, weise und alterslos.
Scene: Altes Orakel, Steinhallen.
Director's Notes: ${baseStyle} Slightly mystical color, but keep it intimate and conversational, never theatrical.${accentGuidance ? ` ${accentGuidance}` : ''}`,

    amara: `Audio Profile: Seelenheilerin, warm und mütterlich.
Scene: Warmes Gemeinschaftshaus, Abendstimmung.
Director's Notes: ${baseStyle} Nurturing tone, emotional clarity, gentle reassurance with natural pacing.${accentGuidance ? ` ${accentGuidance}` : ''}`,

    echo_prism: `Audio Profile: Meta-Synthesizer, neutral und allumfassend.
Scene: Zwischen allen Welten.
Director's Notes: ${baseStyle} Neutral-but-alive synthesis voice. Keep it clear, balanced, and human.${accentGuidance ? ` ${accentGuidance}` : ''}`,
  };
  return directors[key] ?? directors.maya;
}
