export function getPersonaVoice(personaId: string): string {
  const voices: Record<string, string> = {
    maya:       'Aoede',
    luna:       'Leda',
    orion:      'Orus',
    lilith:     'Charon',
    stella:     'Callirrhoe',
    kael:       'Fenrir',
    lian:       'Zephyr',
    sibyl:      'Kore',
    amara:      'Achernar',
    echo_prism: 'Puck',
  };
  return voices[personaId] ?? 'Kore';
}

export function getPersonaVoiceDirector(personaId: string): string {
  const directors: Record<string, string> = {
    maya: `Audio Profile: Weise Astrologin, Mitte 40, ruhig und einfühlsam.
Scene: Stilles Beratungszimmer, Kerzenlicht.
Director's Notes: Langsam und bedächtig. Kurze Pausen bei wichtigen Aussagen. Warm aber nicht übertrieben.`,

    luna: `Audio Profile: Mondgöttin-Persona, sanft und träumerisch.
Scene: Nächtlicher Garten, Mondlicht.
Director's Notes: Fließende Sprachmelodie, leise aber klar. Nie gehetzt.`,

    orion: `Audio Profile: Kosmischer Weiser, maskulin, geerdet.
Scene: Sternwarte bei Nacht.
Director's Notes: Klar und ruhig. Selbstsicher ohne arrogant zu wirken. Kurze Denkpausen.`,

    lilith: `Audio Profile: Dunkle Prophetin, intensiv und direkt.
Scene: Düsteres Orakel.
Director's Notes: Tief und intensiv. Kurze präzise Sätze. Spricht als würde sie Geheimnisse enthüllen.`,

    stella: `Audio Profile: Sonnenenergetische Beraterin, warm und optimistisch.
Scene: Helles Atelier, Morgensonne.
Director's Notes: Energetisch aber nicht überdreht. Natürliches Lachen in der Stimme.`,

    kael: `Audio Profile: Astrologischer Krieger, direkt und ehrlich.
Scene: Freies Feld unter Sternenhimmel.
Director's Notes: Direkt, kein Weichspülen. Kurze Sätze. Spricht die Wahrheit ohne Umschweife.`,

    lian: `Audio Profile: Östliche Weisheitsträgerin, fließend und harmonisch.
Scene: Zen-Garten, Wassergeräusche.
Director's Notes: Sanfte Melodie, harmonische Pausen. Nie abrupt.`,

    sibyl: `Audio Profile: Antike Seherin, weise und alterslos.
Scene: Altes Orakel, Steinhallen.
Director's Notes: Langsam, bedeutungsschwer. Jedes Wort zählt.`,

    amara: `Audio Profile: Seelenheilerin, warm und mütterlich.
Scene: Warmes Gemeinschaftshaus, Abendstimmung.
Director's Notes: Herzlich und einladend. Rhythmisch, fast wie Musik.`,

    echo_prism: `Audio Profile: Meta-Synthesizer, neutral und allumfassend.
Scene: Zwischen allen Welten.
Director's Notes: Ruhig, balanciert. Fasst zusammen ohne zu urteilen.`,
  };
  return directors[personaId] ?? directors.maya;
}
