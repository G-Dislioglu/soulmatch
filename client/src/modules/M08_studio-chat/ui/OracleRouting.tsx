import { useEffect, useMemo, useState } from 'react';
import { PERSONA_COLORS, PERSONA_ICONS, PERSONA_NAMES, PERSONA_TITLES } from '../lib/personaColors';

interface OracleRoutingProps {
  question: string;
  personaId: string;
  onComplete: () => void;
}

interface RoutingStep {
  text: string;
  sub: string;
}

export function OracleRouting({ question, personaId, onComplete }: OracleRoutingProps) {
  const persona = useMemo(() => ({
    id: personaId,
    name: PERSONA_NAMES[personaId] ?? 'Maya',
    icon: PERSONA_ICONS[personaId] ?? '◇',
    color: PERSONA_COLORS[personaId] ?? '#d4af37',
    realm: PERSONA_TITLES[personaId] ?? 'Soulmatch',
  }), [personaId]);

  const [currentStep, setCurrentStep] = useState<RoutingStep>({
    text: `${persona.name} liest deine Frage...`,
    sub: `${persona.realm} wird aktiviert`,
  });

  useEffect(() => {
    const steps: RoutingStep[] = [
      { text: `${persona.name} liest deine Frage...`, sub: `${persona.realm} wird aktiviert` },
      { text: `${persona.name} meldet sich...`, sub: 'Verbindung wird aufgebaut' },
    ];

    let i = 0;
    const interval = window.setInterval(() => {
      if (i >= steps.length) {
        window.clearInterval(interval);
        window.setTimeout(onComplete, 400);
        return;
      }
      const step = steps[i];
      if (step) {
        setCurrentStep(step);
      }
      i += 1;
    }, 800);

    return () => window.clearInterval(interval);
  }, [onComplete, persona.name, persona.realm]);

  return (
    <div className="oracle-routing">
      <div className="routing-avatar" style={{ borderColor: persona.color, color: persona.color }}>
        <span className="routing-icon">{persona.icon}</span>
      </div>

      <div className="routing-text">{currentStep.text}</div>
      <div className="routing-sub">{currentStep.sub}</div>
      <div className="routing-question">"{question}"</div>

      <style>{`\n        .oracle-routing {\n          display: flex;\n          flex-direction: column;\n          align-items: center;\n          justify-content: center;\n          min-height: 80vh;\n          gap: 20px;\n          animation: fadeIn 0.4s ease;\n          text-align: center;\n          padding: 24px;\n        }\n\n        .routing-avatar {\n          width: 100px;\n          height: 100px;\n          border-radius: 50%;\n          border: 1px solid;\n          display: flex;\n          align-items: center;\n          justify-content: center;\n          font-size: 36px;\n          background: rgba(255,255,255,0.04);\n          animation: routingPulse 2s ease-in-out infinite;\n        }\n\n        @keyframes routingPulse {\n          0%, 100% { box-shadow: 0 0 0 0 transparent; transform: scale(1); }\n          50% { box-shadow: 0 0 30px rgba(255,255,255,0.15); transform: scale(1.03); }\n        }\n\n        .routing-text {\n          font-size: 20px;\n          font-weight: 300;\n          font-style: italic;\n          color: rgba(255,255,255,0.7);\n        }\n\n        .routing-sub {\n          font-size: 12px;\n          letter-spacing: 0.12em;\n          text-transform: uppercase;\n          color: rgba(255,255,255,0.3);\n        }\n\n        .routing-question {\n          margin-top: 8px;\n          max-width: 640px;\n          color: rgba(255,255,255,0.32);\n          font-size: 13px;\n          font-style: italic;\n          overflow: hidden;\n          text-overflow: ellipsis;\n          white-space: nowrap;\n        }\n      `}</style>
    </div>
  );
}
