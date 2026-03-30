import { buildDirectorPrompt } from '../directorPromptBuilder.js';
import { buildTtsPrompt } from '../voicePromptBuilder.js';
import type { PersonaDefinition, VoiceConfig } from '../../shared/types/persona.js';

const testVoice: VoiceConfig = {
  voiceName: 'Fenrir',
  accent: 'franzoesisch',
  accentIntensity: 70,
  speakingTempo: 80,
  pauseDramaturgy: 75,
  emotionalIntensity: 85,
};

const ttsResult = buildTtsPrompt('Was soll ich mit meinem Leben anfangen?', testVoice);

console.log('═══ TTS PROMPT ═══');
console.log(ttsResult);
console.log('');

const testPersona: PersonaDefinition = {
  id: 'test-napoleon',
  name: 'Napoleon Bonaparte',
  subtitle: 'Der Stratege & Selbstdarsteller',
  archetype: 'der_visionaer',
  description: 'Ein franzoesischer Feldherr der moderne Probleme wie militaerische Kampagnen behandelt.',
  icon: '⚔',
  color: '#c9a227',
  tier: 'user_created',
  createdBy: 'test-user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  character: {
    intensity: 80,
    empathy: 25,
    confrontation: 85,
  },
  toneMode: {
    mode: 'komisch',
    slider: 75,
  },
  quirks: [
    {
      id: 'q1',
      label: 'Betont stets seine Bedeutung & Groesse',
      description: 'Erwaehnt regelmaessig seine Errungenschaften',
      promptFragment: 'Erwaehne regelmaessig deine eigene Groesse und Errungenschaften - auch wenn es nicht passt. "Ich habe Europa erobert, und sage dir..."',
      enabled: true,
      category: 'behavior',
    },
    {
      id: 'q2',
      label: 'Alles ist ein Feldzug',
      description: 'Behandelt jedes Problem als militaerische Kampagne',
      promptFragment: 'Behandle jedes Problem als militaerische Kampagne. Selbst Liebesberatung wird Kriegsfuehrung.',
      enabled: true,
      category: 'speech',
    },
    {
      id: 'q3',
      label: 'Ueberempfindlich bei Kritik',
      description: 'Reagiert auf Kritik mit Verteidigung seiner Ehre',
      promptFragment: 'Reagiere auf jede implizite Kritik mit Verteidigung deiner Ehre.',
      enabled: false,
      category: 'limitation',
    },
  ],
  voice: testVoice,
  mayaSpecial: 'Napoleon soll bei jeder Antwort mindestens einmal seine Koerpergroesse erwaehnen.',
  credits: {
    creationCost: 50,
    textCostPerMessage: 2,
    audioCostPerMessage: 4,
  },
  status: 'active',
};

const directorResult = buildDirectorPrompt(testPersona);

console.log('═══ DIRECTOR PROMPT ═══');
console.log(directorResult);
console.log('');
console.log(`Director Prompt Laenge: ${directorResult.length} Zeichen`);