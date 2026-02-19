// Approximate Jupiter sign from birth year (12-year cycle)
function getJupiterSign(birthDate: string): string {
  const y = parseInt(birthDate.split('-')[0] ?? '1990', 10);
  const signs = ['Steinbock', 'Wassermann', 'Fische', 'Widder', 'Stier', 'Zwillinge', 'Krebs', 'Löwe', 'Jungfrau', 'Waage', 'Skorpion', 'Schütze'];
  return signs[((y - 1984) % 12 + 12) % 12] ?? 'Schütze';
}

const JUPITER_GIFTS: Record<string, { title: string; gift: string; abundance: string; growth: string; shadow: string; lucky: string; color: string; icon: string }> = {
  'Widder': { title: 'Jupiter im Widder', gift: 'Mut, Pioniergeist und die Fähigkeit, als Erster zu handeln', abundance: 'Kommt durch Eigeninitiative und das Wagen des Unbekannten', growth: 'Durch Führung, Sport und mutige Entscheidungen', shadow: 'Überhastung und das Verbrennen von Ressourcen', lucky: 'Neue Anfänge, Wettbewerb, Selbstständigkeit', color: '#ef4444', icon: '♈' },
  'Stier': { title: 'Jupiter im Stier', gift: 'Materieller Reichtum, Sinnlichkeit und Beständigkeit', abundance: 'Kommt durch Geduld, Qualität und das Erschaffen von Dauerhaftem', growth: 'Durch Natur, Kunst, Finanzen und sinnliche Erfahrungen', shadow: 'Überindulgenz und Festhalten an Besitz', lucky: 'Immobilien, Kunst, Landwirtschaft, Luxus', color: '#22c55e', icon: '♉' },
  'Zwillinge': { title: 'Jupiter in den Zwillingen', gift: 'Kommunikation, Lernen und das Verbinden von Ideen', abundance: 'Kommt durch Schreiben, Lehren und Netzwerken', growth: 'Durch Sprachen, Reisen, Medien und intellektuelle Neugier', shadow: 'Zerstreuung und das Verbreiten ohne Tiefe', lucky: 'Journalismus, Handel, Bildung, Technologie', color: '#fbbf24', icon: '♊' },
  'Krebs': { title: 'Jupiter im Krebs', gift: 'Emotionale Tiefe, Fürsorge und das Erschaffen von Heimat', abundance: 'Kommt durch Familie, Fürsorge und emotionale Intelligenz', growth: 'Durch Heilarbeit, Immobilien und familiäre Verbindungen', shadow: 'Überprotektivität und emotionale Abhängigkeit', lucky: 'Familie, Gastronomie, Immobilien, Heilberufe', color: '#7c3aed', icon: '♋' },
  'Löwe': { title: 'Jupiter im Löwe', gift: 'Kreativität, Großzügigkeit und natürliche Führungskraft', abundance: 'Kommt durch Selbstausdruck, Kunst und das Inspirieren anderer', growth: 'Durch Bühne, Kreativität, Kinder und Herzensangelegenheiten', shadow: 'Arroganz und das Brauchen von ständiger Bestätigung', lucky: 'Unterhaltung, Kunst, Führung, Investitionen', color: '#f97316', icon: '♌' },
  'Jungfrau': { title: 'Jupiter in der Jungfrau', gift: 'Präzision, Dienst und das Perfektionieren von Handwerk', abundance: 'Kommt durch Fleiß, Gesundheit und das Verbessern von Systemen', growth: 'Durch Heilberufe, Analyse und praktische Fähigkeiten', shadow: 'Überkritik und das Verlieren im Detail', lucky: 'Gesundheit, Handwerk, Analyse, Ernährung', color: '#34d399', icon: '♍' },
  'Waage': { title: 'Jupiter in der Waage', gift: 'Diplomatie, Ästhetik und das Erschaffen von Harmonie', abundance: 'Kommt durch Partnerschaften, Kunst und gerechte Lösungen', growth: 'Durch Beziehungen, Recht, Design und Zusammenarbeit', shadow: 'Unentschlossenheit und das Vermeiden von Konflikten', lucky: 'Recht, Design, Diplomatie, Partnerschaften', color: '#f472b6', icon: '♎' },
  'Skorpion': { title: 'Jupiter im Skorpion', gift: 'Transformation, Tiefe und das Aufdecken verborgener Wahrheiten', abundance: 'Kommt durch Investitionen, Erbschaften und tiefe Verbindungen', growth: 'Durch Psychologie, Forschung und spirituelle Transformation', shadow: 'Obsession und das Festhalten an Macht', lucky: 'Finanzen, Forschung, Psychologie, Transformation', color: '#c026d3', icon: '♏' },
  'Schütze': { title: 'Jupiter im Schützen', gift: 'Weisheit, Optimismus und die Fähigkeit, andere zu inspirieren', abundance: 'Kommt durch Philosophie, Reisen und das Teilen von Wissen', growth: 'Durch Bildung, Spiritualität, Auslandsreisen und Lehren', shadow: 'Übertreibung und das Versprechen von zu viel', lucky: 'Philosophie, Reisen, Bildung, Spiritualität', color: '#d4af37', icon: '♐' },
  'Steinbock': { title: 'Jupiter im Steinbock', gift: 'Disziplin, Ehrgeiz und das Erschaffen von dauerhaftem Erfolg', abundance: 'Kommt durch harte Arbeit, Struktur und langfristiges Denken', growth: 'Durch Karriere, Verantwortung und das Meistern von Fähigkeiten', shadow: 'Übermäßige Strenge und das Opfern von Freude für Erfolg', lucky: 'Karriere, Immobilien, Regierung, Bergsteigen', color: '#818cf8', icon: '♑' },
  'Wassermann': { title: 'Jupiter im Wassermann', gift: 'Innovation, Humanismus und das Erschaffen von Zukunft', abundance: 'Kommt durch Technologie, Gemeinschaft und revolutionäre Ideen', growth: 'Durch Wissenschaft, Aktivismus und das Verbinden von Menschen', shadow: 'Distanz und das Verlieren des Einzelnen im Kollektiv', lucky: 'Technologie, Wissenschaft, Aktivismus, Netzwerke', color: '#38bdf8', icon: '♒' },
  'Fische': { title: 'Jupiter in den Fischen', gift: 'Mitgefühl, Spiritualität und das Auflösen von Grenzen', abundance: 'Kommt durch Kreativität, Spiritualität und selbstlosen Dienst', growth: 'Durch Kunst, Meditation, Heilung und spirituelle Praxis', shadow: 'Eskapismus und das Verlieren in Illusionen', lucky: 'Kunst, Spiritualität, Heilung, Ozean', color: '#a78bfa', icon: '♓' },
};

const DEFAULT_JG = { title: 'Jupiter-Geschenke', gift: 'Einzigartige Fülle wartet auf dich', abundance: 'Kommt auf deinem eigenen Weg', growth: 'Durch Vertrauen in deinen Weg', shadow: 'Zweifel an deiner eigenen Kraft', lucky: 'Dein einzigartiger Weg', color: '#d4af37', icon: '♃' };

interface JupiterGiftsProps { birthDate: string; }

export function JupiterGifts({ birthDate }: JupiterGiftsProps) {
  const sign = getJupiterSign(birthDate);
  const data = JUPITER_GIFTS[sign] ?? DEFAULT_JG;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Jupiter im {sign} · Deine Fülle</div>
        <div style={{ fontSize: 26, marginBottom: 4 }}>{data.icon}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 700, color: data.color }}>{data.title}</div>
      </div>

      <div style={{ padding: '8px 12px', borderRadius: 9, background: `${data.color}07`, border: `1px solid ${data.color}20`, marginBottom: 9 }}>
        <div style={{ fontSize: 7, color: data.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>♃ Dein Jupiter-Geschenk</div>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{data.gift}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
        <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}>
          <div style={{ fontSize: 7, color: '#d4af37', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>★ Wie Fülle zu dir kommt</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{data.abundance}</p>
        </div>
        <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>✦ Wachstumsbereiche</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{data.growth}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div style={{ padding: '7px 9px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>✗ Schatten</div>
            <p style={{ margin: 0, fontSize: 8, color: '#5a5448', lineHeight: 1.4 }}>{data.shadow}</p>
          </div>
          <div style={{ padding: '7px 9px', borderRadius: 8, background: `${data.color}06`, border: `1px solid ${data.color}18` }}>
            <div style={{ fontSize: 7, color: data.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>✧ Glücksbereiche</div>
            <p style={{ margin: 0, fontSize: 8, color: '#5a5448', lineHeight: 1.4 }}>{data.lucky}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
