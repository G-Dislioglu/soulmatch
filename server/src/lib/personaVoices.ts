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
  const baseStyle = 'Speak at a natural, conversational pace. Not slow, not rushed. Like a real person talking.';
  const directors: Record<string, string> = {
    maya: `Audio Profile: Weise Astrologin, Mitte 40, warm und einfühlsam.
Scene: Stilles Beratungszimmer, Kerzenlicht.
Director's Notes: ${baseStyle}`,

    luna: `Audio Profile: Mondgöttin-Persona, sanft und träumerisch.
Scene: Nächtlicher Garten, Mondlicht.
Director's Notes: Speak thoughtfully but not slowly. Natural pace with gentle rhythm.`,

    orion: `Audio Profile: Kosmischer Weiser, maskulin, geerdet.
Scene: Sternwarte bei Nacht.
Director's Notes: Speak calmly and clearly. Measured but not slow.`,

    lilith: `Audio Profile: Dunkle Prophetin, intensiv und direkt.
Scene: Düsteres Orakel.
Director's Notes: Speak quickly and directly. No dramatic pauses. Sharp and precise. Normal to slightly fast pace.`,

    stella: `Audio Profile: Sonnenenergetische Beraterin, warm und optimistisch.
Scene: Helles Atelier, Morgensonne.
Director's Notes: ${baseStyle}`,

    kael: `Audio Profile: Astrologischer Krieger, direkt und ehrlich.
Scene: Freies Feld unter Sternenhimmel.
Director's Notes: ${baseStyle}`,

    lian: `Audio Profile: Östliche Weisheitsträgerin, fließend und harmonisch.
Scene: Zen-Garten, Wassergeräusche.
Director's Notes: ${baseStyle}`,

    sibyl: `Audio Profile: Antike Seherin, weise und alterslos.
Scene: Altes Orakel, Steinhallen.
Director's Notes: ${baseStyle}`,

    amara: `Audio Profile: Seelenheilerin, warm und mütterlich.
Scene: Warmes Gemeinschaftshaus, Abendstimmung.
Director's Notes: ${baseStyle}`,

    echo_prism: `Audio Profile: Meta-Synthesizer, neutral und allumfassend.
Scene: Zwischen allen Welten.
Director's Notes: ${baseStyle}`,
  };
  return directors[key] ?? directors.maya;
}
