import React, { useState, useCallback, useRef, useEffect } from 'react';

// --- Types ---

type PhaseStatus = 'pending' | 'processing' | 'completed' | 'error';

interface Phase {
  id: string;
  name: string;
  status: PhaseStatus;
  icon: React.ReactNode;
  output?: string;
}

interface TaskEntry {
  id: string;
  timestamp: number;
  intent: string;
  phases: Phase[];
}

// --- Icons (Simple SVG Components) ---

const IconBrain = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
  </svg>
);

const IconCode = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const IconCheck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconLoader = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const IconChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const IconChevronUp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 15-6-6-6 6"/>
  </svg>
);

// --- Styles ---

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    width: '100%',
    backgroundColor: '#0a0b0f',
    color: '#e0e0e0',
    fontFamily: '"DM Sans", sans-serif',
    overflow: 'hidden',
  },
  leftColumn: {
    width: '30%',
    borderRight: '1px solid #1f2128',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#0d0e12',
  },
  rightColumn: {
    width: '70%',
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'relative' as const,
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid #1f2128',
    fontFamily: '"Cinzel", serif',
    color: '#c9a84c',
    fontSize: '1.2rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
  },
  taskList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '10px',
  },
  taskCard: {
    backgroundColor: '#14161b',
    border: '1px solid #2a2d35',
    borderRadius: '8px',
    marginBottom: '12px',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  },
  taskHeader: {
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    borderBottom: '1px solid transparent',
  },
  taskHeaderExpanded: {
    borderBottom: '1px solid #2a2d35',
  },
  taskIntent: {
    fontSize: '0.9rem',
    fontWeight: 500,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '85%',
    color: '#f0f0f0',
  },
  taskMeta: {
    fontSize: '0.75rem',
    color: '#888',
    marginTop: '4px',
  },
  taskBody: {
    padding: '16px',
    backgroundColor: '#0f1115',
  },
  phaseRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '0.85rem',
  },
  phaseIcon: {
    marginRight: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '4px',
  },
  inputArea: {
    padding: '20px',
    borderBottom: '1px solid #1f2128',
    backgroundColor: '#0d0e12',
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    backgroundColor: '#14161b',
    border: '1px solid #2a2d35',
    borderRadius: '8px',
    color: '#e0e0e0',
    padding: '12px',
    fontFamily: '"DM Sans", sans-serif',
    fontSize: '1rem',
    resize: 'vertical' as const,
    outline: 'none',
  },
  textareaFocus: {
    borderColor: '#c9a84c',
  },
  submitBtn: {
    marginTop: '10px',
    padding: '10px 20px',
    backgroundColor: '#c9a84c',
    color: '#0a0b0f',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: '"DM Sans", sans-serif',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  outputGrid: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto' as const,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    alignContent: 'start',
  },
  outputCard: {
    backgroundColor: '#14161b',
    border: '1px solid #2a2d35',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  outputHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
    color: '#c9a84c',
    fontFamily: '"Cinzel", serif',
    fontSize: '0.9rem',
  },
  outputContent: {
    flex: 1,
    backgroundColor: '#0a0b0f',
    borderRadius: '4px',
    padding: '10px',
    fontSize: '0.85rem',
    fontFamily: 'monospace',
    color: '#a0a0a0',
    overflowX: 'auto' as const,
    whiteSpace: 'pre-wrap' as const,
  },
  statusBadge: (status: PhaseStatus) => ({
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.7rem',
    fontWeight: 600,
    marginLeft: 'auto',
    backgroundColor: 
      status === 'completed' ? 'rgba(76, 175, 80, 0.2)' :
      status === 'processing' ? 'rgba(201, 168, 76, 0.2)' :
      status === 'error' ? 'rgba(244, 67, 54, 0.2)' :
      'rgba(255, 255, 255, 0.1)',
    color: 
      status === 'completed' ? '#4caf50' :
      status === 'processing' ? '#c9a84c' :
      status === 'error' ? '#f44336' :
      '#888',
  })
};

// --- Helper Functions ---

const getOpusToken = () => {
  // In a real app, retrieve from secure storage or context
  return localStorage.getItem('opus_token') || 'demo-token';
};

const mockPhases: Phase[] = [
  { id: 'p1', name: 'Intent Analysis', status: 'pending', icon: <IconBrain /> },
  { id: 'p2', name: 'Code Generation', status: 'pending', icon: <IconCode /> },
  { id: 'p3', name: 'Validation', status: 'pending', icon: <IconCheck /> },
];

// --- Component ---

export default function BuilderStudio() {
  const [input, setInput] = useState('');
  const [tasks, setTasks] = useState<TaskEntry[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleExpand = useCallback((id: string) => {
    setExpandedTaskId(prev => prev === id ? null : id);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isSubmitting) return;

    const newTaskId = Date.now().toString();
    const newTask: TaskEntry = {
      id: newTaskId,
      timestamp: Date.now(),
      intent: input.trim(),
      phases: JSON.parse(JSON.stringify(mockPhases)), // Deep copy
    };

    // Optimistic update
    setTasks(prev => [newTask, ...prev]);
    setInput('');
    setIsSubmitting(true);
    setExpandedTaskId(newTaskId); // Auto-expand new task

    try {
      const token = getOpusToken();
      // Simulate API call structure
      const response = await fetch(`/api/builder/opus-bridge/opus-feature?opus_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: newTask.intent }),
      });

      if (!response.ok) throw new Error('API request failed');
      
      // In a real scenario, we might stream or poll for phase updates.
      // Here we simulate a successful completion after a delay for demo purposes
      // if the backend doesn't return immediate phase data.
      
      // Update phases to processing
      setTasks(prev => prev.map(t => {
        if (t.id !== newTaskId) return t;
        return {
          ...t,
          phases: t.phases.map((p, i) => i === 0 ? { ...p, status: 'processing' } : p)
        };
      }));

      // Simulate processing time
      await new Promise(r => setTimeout(r, 1500));

      // Update to completed
      setTasks(prev => prev.map(t => {
        if (t.id !== newTaskId) return t;
        return {
          ...t,
          phases: t.phases.map(p => ({ ...p, status: 'completed', output: `Output for ${p.name} generated successfully.` }))
        };
      }));

    } catch (error) {
      console.error('Submission error:', error);
      setTasks(prev => prev.map(t => {
        if (t.id !== newTaskId) return t;
        return {
          ...t,
          phases: t.phases.map(p => ({ ...p, status: 'error', output: 'Failed to process phase.' }))
        };
      }));
    } finally {
      setIsSubmitting(false);
    }
  }, [input, isSubmitting]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div style={styles.container}>
      {/* Left Column: Task History */}
      <div style={styles.leftColumn}>
        <div style={styles.header}>Builder History</div>
        <div style={styles.taskList}>
          {tasks.length === 0 && (
            <div style={{ textAlign: 'center', color: '#555', marginTop: '40px', fontSize: '0.9rem' }}>
              No tasks yet.<br/>Start building below.
            </div>
          )}
          {tasks.map(task => (
            <div key={task.id} style={styles.taskCard}>
              <div 
                style={{
                  ...styles.taskHeader,
                  ...(expandedTaskId === task.id ? styles.taskHeaderExpanded : {})
                }}
                onClick={() => handleExpand(task.id)}
              >
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={styles.taskIntent}>{task.intent}</div>
                  <div style={styles.taskMeta}>
                    {new Date(task.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <div style={{ color: '#c9a84c' }}>
                  {expandedTaskId === task.id ? <IconChevronUp /> : <IconChevronDown />}
                </div>
              </div>
              
              {expandedTaskId === task.id && (
                <div style={styles.taskBody}>
                  {task.phases.map(phase => (
                    <div key={phase.id} style={styles.phaseRow}>
                      <div style={{
                        ...styles.phaseIcon,
                        color: phase.status === 'completed' ? '#4caf50' : phase.status === 'error' ? '#f44336' : '#c9a84c'
                      }}>
                        {phase.status === 'processing' ? <IconLoader /> : phase.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#ddd' }}>{phase.name}</div>
                        {phase.output && (
                          <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '2px' }}>
                            {phase.output}
                          </div>
                        )}
                      </div>
                      <span style={styles.statusBadge(phase.status)}>
                        {phase.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Input & Output */}
      <div style={styles.rightColumn}>
        <div style={styles.inputArea}>
          <textarea
            ref={textareaRef}
            style={styles.textarea}
            placeholder="Describe the feature you want to build... (Ctrl+Enter to submit)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
          <button 
            style={{
              ...styles.submitBtn,
              opacity: isSubmitting || !input.trim() ? 0.7 : 1,
              cursor: isSubmitting || !input.trim() ? 'not-allowed' : 'pointer'
            }}
            onClick={handleSubmit}
            disabled={isSubmitting || !input.trim()}
          >
            {isSubmitting ? <IconLoader /> : <IconBrain />}
            {isSubmitting ? 'Processing...' : 'Generate Feature'}
          </button>
        </div>

        <div style={styles.outputGrid}>
          {/* Display phases of the most recent active task or all completed tasks */}
          {tasks.map(task => (
             task.phases.some(p => p.output) && (
               <React.Fragment key={`out-${task.id}`}>
                 {task.phases.map(phase => phase.output && (
                   <div key={`phase-out-${phase.id}`} style={styles.outputCard}>
                     <div style={styles.outputHeader}>
                       <span style={{ marginRight: '8px' }}>{phase.icon}</span>
                       {phase.name}
                       <span style={styles.statusBadge(phase.status)}>{phase.status}</span>
                     </div>
                     <div style={styles.outputContent}>
                       {phase.output}
                     </div>
                   </div>
                 ))}
               </React.Fragment>
             )
          ))}
          
          {tasks.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#444', marginTop: '100px' }}>
              Pipeline output will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}