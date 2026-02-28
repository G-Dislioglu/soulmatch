import { useState } from 'react'
import { StudioSetup, StudioConfig } from './StudioSetup'
import { StudioSession } from './StudioSession'

type View = 'setup' | 'session'

export function StudioPage() {
  const [view, setView] = useState<View>('setup')
  const [config, setConfig] = useState<StudioConfig | null>(null)

  return (
    <div className="studio-page">
      {view === 'setup' && (
        <StudioSetup
          onStart={(cfg) => {
            setConfig(cfg)
            setView('session')
          }}
        />
      )}
      {view === 'session' && config && (
        <StudioSession
          config={config}
          onBack={() => {
            setConfig(null)
            setView('setup')
          }}
        />
      )}
    </div>
  )
}
