// Worker Profiles — Agent Habitat Identity+Capability Layer (slim v1)
// Maya uses these to pick the right worker for each task.
//
// DRIFT-WARNUNG: Die Model-IDs hier MUESSEN konsistent zu POOL_MODEL_MAP in
// server/src/lib/poolState.ts sein. Wenn du dort ein Modell updatest, update
// auch hier. Letzter Sync: 2026-04-20 (S34).

export interface WorkerProfile {
  id: string;
  provider: string;
  model: string;
  role: string;
  strengths: string[];
  weaknesses: string[];
  bestFor: string[];
  avoidFor: string[];
  costTier: 'free' | 'cheap' | 'medium' | 'expensive';
  speedTier: 'fast' | 'medium' | 'slow';
  codeQuality: number; // 0-100
  reliability: number; // 0-100
}

export const WORKER_PROFILES: WorkerProfile[] = [
  {
    id: 'glm-turbo',
    provider: 'zhipu',
    model: 'glm-4.7-flashx',
    role: 'primary-coder',
    strengths: ['fast execution', 'good TypeScript', 'reliable patches', 'low cost'],
    weaknesses: ['shallow architecture reasoning', 'can miss edge cases'],
    bestFor: ['bug fixes', 'small features', 'UI tweaks', 'endpoint additions'],
    avoidFor: ['complex refactors', 'architecture decisions', 'multi-file rewrites'],
    costTier: 'cheap',
    speedTier: 'fast',
    codeQuality: 78,
    reliability: 85,
  },
  {
    id: 'minimax',
    provider: 'openrouter',
    model: 'minimax/minimax-m2.7',
    role: 'code-worker',
    strengths: ['large context window', 'good at following instructions', 'decent TypeScript'],
    weaknesses: ['slower', 'occasionally verbose patches', 'can hallucinate imports'],
    bestFor: ['medium features', 'multi-file changes', 'code with lots of context'],
    avoidFor: ['quick fixes', 'latency-sensitive tasks'],
    costTier: 'cheap',
    speedTier: 'medium',
    codeQuality: 72,
    reliability: 80,
  },
  {
    id: 'kimi',
    provider: 'openrouter',
    model: 'moonshotai/kimi-k2.6',
    role: 'code-worker',
    strengths: ['strong reasoning', 'good at complex logic', 'handles edge cases'],
    weaknesses: ['slower', 'sometimes over-engineers', 'occasional syntax issues'],
    bestFor: ['complex logic', 'algorithm work', 'tricky bugs'],
    avoidFor: ['simple UI changes', 'quick patches'],
    costTier: 'cheap',
    speedTier: 'medium',
    codeQuality: 70,
    reliability: 75,
  },
  {
    id: 'mimo',
    provider: 'openrouter',
    model: 'xiaomi/mimo-v2.5',
    role: 'code-worker',
    strengths: ['strong autonomous coding', 'good long-context synthesis', 'solid multi-file planning'],
    weaknesses: ['newer provider family in this stack', 'can still overcommit on unfamiliar repo patterns'],
    bestFor: ['multi-file implementation', 'tool-heavy coding tasks', 'iterative cleanup passes'],
    avoidFor: ['tiny one-line fixes', 'latency-sensitive quick answers'],
    costTier: 'medium',
    speedTier: 'medium',
    codeQuality: 76,
    reliability: 77,
  },
  {
    id: 'qwen',
    provider: 'openrouter',
    model: 'qwen/qwen3.6-plus',
    role: 'code-worker',
    strengths: ['specialized for code', 'good TypeScript', 'follows patterns well'],
    weaknesses: ['weaker on architecture', 'can be rigid'],
    bestFor: ['code generation', 'pattern-following tasks', 'boilerplate'],
    avoidFor: ['creative solutions', 'novel architectures'],
    costTier: 'cheap',
    speedTier: 'fast',
    codeQuality: 68,
    reliability: 72,
  },
  {
    id: 'gpt-5.5',
    provider: 'openai',
    model: 'gpt-5.5',
    role: 'senior-worker',
    strengths: ['strong reasoning', 'good architecture sense', 'reliable code quality'],
    weaknesses: ['expensive', 'slower', 'sometimes overthinks simple tasks'],
    bestFor: ['architecture changes', 'complex refactors', 'review', 'multi-concern tasks'],
    avoidFor: ['trivial patches', 'cost-sensitive bulk tasks'],
    costTier: 'expensive',
    speedTier: 'medium',
    codeQuality: 88,
    reliability: 90,
  },
  {
    id: 'deepseek',
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    role: 'scout-reviewer',
    strengths: ['excellent reasoning', 'very cheap', 'good at analysis'],
    weaknesses: ['code patches sometimes need adjustment', 'not always precise on TS types'],
    bestFor: ['code review', 'scouting', 'analysis', 'planning'],
    avoidFor: ['direct code execution on strict TS'],
    costTier: 'cheap',
    speedTier: 'fast',
    codeQuality: 65,
    reliability: 78,
  },
];

export function pickWorker(taskDescription: string): WorkerProfile {
  const desc = taskDescription.toLowerCase();

  // Architecture/complex → GPT-5.5
  if (/architect|refactor|complex|redesign|multi.file/i.test(desc)) {
    return WORKER_PROFILES.find(w => w.id === 'gpt-5.5')!;
  }
  // Review/analysis → DeepSeek
  if (/review|analyze|scout|plan|check/i.test(desc)) {
    return WORKER_PROFILES.find(w => w.id === 'deepseek')!;
  }
  // Complex logic → Kimi
  if (/algorithm|logic|tricky|edge.case/i.test(desc)) {
    return WORKER_PROFILES.find(w => w.id === 'kimi')!;
  }
  // Default → GLM (fast, cheap, reliable)
  return WORKER_PROFILES.find(w => w.id === 'glm-turbo')!;
}

export function getWorkerById(id: string): WorkerProfile | undefined {
  return WORKER_PROFILES.find(w => w.id === id);
}
