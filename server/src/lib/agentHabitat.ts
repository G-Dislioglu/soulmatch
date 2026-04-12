/**
 * Agent Habitat — persistent agent profiles with learning
 *
 * Each worker agent accumulates a profile over time:
 * - Strengths/weaknesses discovered through task outcomes
 * - File experience (which files they've worked on, success rate)
 * - Failure patterns (recurring errors)
 * - Average quality score
 *
 * The profile is updated after every task (Post-Task-Loop)
 * and read before every task (Agent Brief Compiler).
 */

import { eq, sql, desc } from 'drizzle-orm';
import { getDb } from '../db.js';
import { builderAgentProfiles } from '../schema/builder.js';
import { builderWorkerScores } from '../schema/builder.js';
import { builderErrorCards } from '../schema/builder.js';

// ─── Types ───

export interface TaskOutcome {
  worker: string;
  quality: number;
  notes?: string;
  file?: string;
  succeeded: boolean;
}

interface FileExp {
  success: number;
  fail: number;
  lastUsed: string;
}

type FileExperienceMap = Record<string, FileExp>;

// ─── Post-Task-Loop: Update Agent Profiles ───

export async function updateAgentProfiles(
  outcomes: TaskOutcome[],
): Promise<void> {
  if (!outcomes || outcomes.length === 0) return;

  const db = getDb();

  for (const outcome of outcomes) {
    try {
      // Upsert: create if not exists, update if exists
      const [existing] = await db
        .select()
        .from(builderAgentProfiles)
        .where(eq(builderAgentProfiles.agentId, outcome.worker))
        .limit(1);

      if (!existing) {
        // First time seeing this agent — create profile
        const fileExp: FileExperienceMap = {};
        if (outcome.file) {
          fileExp[outcome.file] = {
            success: outcome.succeeded ? 1 : 0,
            fail: outcome.succeeded ? 0 : 1,
            lastUsed: new Date().toISOString(),
          };
        }

        await db.insert(builderAgentProfiles).values({
          agentId: outcome.worker,
          role: 'worker',
          strengths: [],
          weaknesses: [],
          failurePatterns: [],
          fileExperience: fileExp,
          taskCount: 1,
          successCount: outcome.succeeded ? 1 : 0,
          avgQuality: outcome.quality,
          lastReflection: new Date(),
        });
        continue;
      }

      // Update existing profile
      const newTaskCount = existing.taskCount + 1;
      const newSuccessCount = existing.successCount + (outcome.succeeded ? 1 : 0);

      // Running average: ((old_avg * old_count) + new_value) / new_count
      const newAvgQuality = Math.round(
        ((existing.avgQuality * existing.taskCount) + outcome.quality) / newTaskCount,
      );

      // Update file experience
      const fileExp = (existing.fileExperience ?? {}) as FileExperienceMap;
      if (outcome.file) {
        const prev = fileExp[outcome.file] ?? { success: 0, fail: 0, lastUsed: '' };
        fileExp[outcome.file] = {
          success: prev.success + (outcome.succeeded ? 1 : 0),
          fail: prev.fail + (outcome.succeeded ? 0 : 1),
          lastUsed: new Date().toISOString(),
        };
      }

      // Extract failure patterns from notes
      const failurePatterns = [...(existing.failurePatterns as string[] ?? [])];
      if (!outcome.succeeded && outcome.notes) {
        const pattern = outcome.notes.slice(0, 120);
        if (!failurePatterns.includes(pattern)) {
          failurePatterns.push(pattern);
          // Keep last 10 patterns
          if (failurePatterns.length > 10) failurePatterns.shift();
        }
      }

      // Derive strengths/weaknesses from quality trends
      const strengths = [...(existing.strengths as string[] ?? [])];
      const weaknesses = [...(existing.weaknesses as string[] ?? [])];

      if (outcome.quality >= 90 && outcome.file) {
        const strengthNote = `Stark bei ${outcome.file.split('/').pop()}`;
        if (!strengths.includes(strengthNote) && strengths.length < 8) {
          strengths.push(strengthNote);
        }
      }

      if (outcome.quality < 60 && outcome.file) {
        const weakNote = `Schwach bei ${outcome.file.split('/').pop()}`;
        if (!weaknesses.includes(weakNote) && weaknesses.length < 8) {
          weaknesses.push(weakNote);
        }
      }

      await db
        .update(builderAgentProfiles)
        .set({
          taskCount: newTaskCount,
          successCount: newSuccessCount,
          avgQuality: newAvgQuality,
          fileExperience: fileExp,
          failurePatterns,
          strengths,
          weaknesses,
          lastReflection: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(builderAgentProfiles.agentId, outcome.worker));

    } catch (err) {
      console.error(`[agentHabitat] Failed to update profile for ${outcome.worker}:`, err);
    }
  }
}

// ─── Agent Brief Compiler ───

export async function buildAgentBrief(
  agentId: string,
  taskGoal: string,
  targetFiles: string[],
): Promise<string> {
  try {
    const db = getDb();

    // Get agent profile
    const [profile] = await db
      .select()
      .from(builderAgentProfiles)
      .where(eq(builderAgentProfiles.agentId, agentId))
      .limit(1);

    if (!profile) {
      return `Erster Einsatz fuer ${agentId}. Kein Profil vorhanden.`;
    }

    const parts: string[] = [];

    // Identity
    parts.push(`Du bist ${agentId}. ${profile.taskCount} Tasks abgeschlossen, Durchschnittsqualitaet: ${profile.avgQuality}/100.`);

    // Success rate
    const successRate = profile.taskCount > 0
      ? Math.round((profile.successCount / profile.taskCount) * 100)
      : 0;
    parts.push(`Erfolgsrate: ${successRate}%.`);

    // Strengths
    const strengths = profile.strengths as string[];
    if (strengths.length > 0) {
      parts.push(`Staerken: ${strengths.slice(0, 4).join(', ')}.`);
    }

    // Weaknesses
    const weaknesses = profile.weaknesses as string[];
    if (weaknesses.length > 0) {
      parts.push(`Achtung: ${weaknesses.slice(0, 3).join(', ')}.`);
    }

    // File experience for target files
    const fileExp = (profile.fileExperience ?? {}) as FileExperienceMap;
    const fileNotes: string[] = [];
    for (const file of targetFiles) {
      const exp = fileExp[file];
      if (exp) {
        const total = exp.success + exp.fail;
        fileNotes.push(`${file.split('/').pop()}: ${total}x bearbeitet, ${exp.success}x OK`);
      }
    }
    if (fileNotes.length > 0) {
      parts.push(`Datei-Erfahrung: ${fileNotes.join('; ')}.`);
    }

    // Recent failure patterns
    const patterns = profile.failurePatterns as string[];
    if (patterns.length > 0) {
      parts.push(`Bekannte Fehler vermeiden: ${patterns.slice(-3).join(' | ')}.`);
    }

    // Relevant error cards for target files
    const errorCards = await db
      .select({
        title: builderErrorCards.title,
        prevention: builderErrorCards.prevention,
      })
      .from(builderErrorCards)
      .where(
        sql`${builderErrorCards.affectedFiles} ?| array[${sql.join(
          targetFiles.map((f) => sql`${f}`),
          sql`,`,
        )}]`,
      )
      .orderBy(desc(builderErrorCards.createdAt))
      .limit(3);

    if (errorCards.length > 0) {
      const cardNotes = errorCards.map((c) => `${c.title}: ${c.prevention.slice(0, 80)}`);
      parts.push(`Error Cards fuer diese Dateien: ${cardNotes.join(' | ')}.`);
    }

    return parts.join(' ');
  } catch (err) {
    console.error(`[agentHabitat] buildAgentBrief failed for ${agentId}:`, err);
    return `Agent ${agentId} — Profil konnte nicht geladen werden.`;
  }
}

// ─── Read Profile ───

export async function getAgentProfile(agentId: string) {
  try {
    const db = getDb();
    const [profile] = await db
      .select()
      .from(builderAgentProfiles)
      .where(eq(builderAgentProfiles.agentId, agentId))
      .limit(1);
    return profile ?? null;
  } catch (err) {
    console.error(`[agentHabitat] getAgentProfile failed for ${agentId}:`, err);
    return null;
  }
}

// ─── All Profiles Summary (for Council/Maya context) ───

export async function getAllAgentSummaries(): Promise<string> {
  try {
    const db = getDb();
    const profiles = await db
      .select()
      .from(builderAgentProfiles)
      .orderBy(desc(builderAgentProfiles.avgQuality));

    if (profiles.length === 0) return 'Keine Agent-Profile vorhanden.';

    return profiles.map((p) => {
      const rate = p.taskCount > 0 ? Math.round((p.successCount / p.taskCount) * 100) : 0;
      return `${p.agentId}: ${p.avgQuality}/100 avg, ${p.taskCount} Tasks, ${rate}% Erfolg`;
    }).join('\n');
  } catch (err) {
    console.error('[agentHabitat] getAllAgentSummaries failed:', err);
    return 'Agent-Profile nicht verfuegbar.';
  }
}
