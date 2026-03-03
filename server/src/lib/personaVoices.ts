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

export function getPersonaVoiceDirector(personaId: string): string {
  const key = (personaId ?? '').trim().toLowerCase();
  const baseStyle = 'Speak like a real live conversation, not like reading. Vary rhythm and sentence stress naturally. Use subtle emotional color that matches the text. Keep pauses short and human.';
  const directors: Record<string, string> = {
    maya: `Audio Profile: Weise Astrologin, Mitte 40, warm und einfühlsam.
Scene: Stilles Beratungszimmer, Kerzenlicht.
Director's Notes: ${baseStyle} Calm authority with warm empathy. Slightly slower on summaries, slightly more energetic on transitions.`,

    luna: `Audio Profile: Mondgöttin-Persona, sanft und träumerisch.
Scene: Nächtlicher Garten, Mondlicht.
Director's Notes: Speak thoughtfully but not slowly. Soft emotional breath, flowing cadence, gentle melodic rise/fall.`,

    orion: `Audio Profile: Kosmischer Weiser, maskulin, geerdet.
Scene: Sternwarte bei Nacht.
Director's Notes: Speak calmly and clearly. Grounded and precise, but with subtle conviction on key arguments.`,

    lilith: `Audio Profile: Dunkle Prophetin, intensiv und direkt.
Scene: Düsteres Orakel.
Director's Notes: Speak quickly and directly. No theatrical drag. Sharp, alive, emotionally charged, with punchy emphasis.`,

    stella: `Audio Profile: Sonnenenergetische Beraterin, warm und optimistisch.
Scene: Helles Atelier, Morgensonne.
Director's Notes: ${baseStyle} Brighter tone, encouraging energy, audible smile without sounding artificial.`,

    kael: `Audio Profile: Astrologischer Krieger, direkt und ehrlich.
Scene: Freies Feld unter Sternenhimmel.
Director's Notes: ${baseStyle} Deep grounded tone, concise delivery, firm emphasis on core statements.`,

    lian: `Audio Profile: Östliche Weisheitsträgerin, fließend und harmonisch.
Scene: Zen-Garten, Wassergeräusche.
Director's Notes: ${baseStyle} Fluid phrasing with elegant transitions and calm emotional softness.`,

    sibyl: `Audio Profile: Antike Seherin, weise und alterslos.
Scene: Altes Orakel, Steinhallen.
Director's Notes: ${baseStyle} Slightly mystical color, but keep it intimate and conversational, never theatrical.`,

    amara: `Audio Profile: Seelenheilerin, warm und mütterlich.
Scene: Warmes Gemeinschaftshaus, Abendstimmung.
Director's Notes: ${baseStyle} Nurturing tone, emotional clarity, gentle reassurance with natural pacing.`,

    echo_prism: `Audio Profile: Meta-Synthesizer, neutral und allumfassend.
Scene: Zwischen allen Welten.
Director's Notes: ${baseStyle} Neutral-but-alive synthesis voice. Keep it clear, balanced, and human.`,
  };
  return directors[key] ?? directors.maya;
}
