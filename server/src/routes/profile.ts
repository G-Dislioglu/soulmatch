import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import { devLogger } from '../devLogger.js';
import { getDb, profiles, type ProfileRecord } from '../db.js';
import { eq } from 'drizzle-orm';

// Types from shared contract (copied from client/src/shared/types/profile.ts)
interface UserProfile {
  id: string;
  name: string;
  birthDate: string;
  birthTime?: string;
  birthPlace?: string;
  birthLocation?: {
    label: string;
    lat: number;
    lon: number;
    countryCode: string;
    timezone?: string;
  };
  timezone?: string;
  createdAt: string;
  updatedAt: string;
}

// Request types for API
interface CreateProfileRequest {
  name: string;
  birthDate: string;
  birthTime?: string;
  birthPlace?: string;
  birthLocation?: {
    label: string;
    lat: number;
    lon: number;
    countryCode: string;
    timezone?: string;
  };
  timezone?: string;
}

interface UpdateProfileRequest {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  birthLocation?: {
    label: string;
    lat: number;
    lon: number;
    countryCode: string;
    timezone?: string;
  };
  timezone?: string;
}

export const profileRouter = Router();

function normalizeRequiredField(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalField(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim();
}

// POST /api/profile
profileRouter.post('/', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const body: CreateProfileRequest = req.body;

    const name = normalizeRequiredField(body.name);
    const birthDate = normalizeRequiredField(body.birthDate);

    if (!name || !birthDate) {
      return res.status(400).json({ error: 'name and birthDate are required' });
    }

    const now = new Date().toISOString();
    const profile: UserProfile = {
      id: randomUUID(),
      name,
      birthDate,
      birthTime: body.birthTime,
      birthPlace: body.birthPlace,
      birthLocation: body.birthLocation,
      timezone: body.timezone,
      createdAt: now,
      updatedAt: now,
    };

    // Insert into database
    await db.insert(profiles).values({
      id: profile.id,
      profileJson: JSON.stringify(profile),
      createdAt: new Date(profile.createdAt),
      updatedAt: new Date(profile.updatedAt),
    });

    devLogger.info('api', 'Profile created', { profileId: profile.id });
    
    res.status(201).json(profile);
  } catch (error) {
    devLogger.error('api', 'Failed to create profile', { error: String(error) });
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// GET /api/profile/:id
profileRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    const result = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    
    const profileRecord: ProfileRecord = result[0]!;
    
    // Safety check for corrupted JSON
    if (!profileRecord.profileJson) {
      devLogger.error('api', 'Profile JSON is null or empty', { profileId: id });
      return res.status(500).json({ error: 'profile_data_corrupted' });
    }
    
    let profile: UserProfile;
    try {
      profile = JSON.parse(profileRecord.profileJson);
    } catch (parseError) {
      devLogger.error('api', 'Failed to parse profile JSON', { 
        profileId: id, 
        error: String(parseError) 
      });
      return res.status(500).json({ error: 'profile_data_corrupted' });
    }
    
    res.json(profile);
  } catch (error) {
    devLogger.error('api', 'Failed to get profile', { error: String(error) });
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// PUT /api/profile/:id
profileRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const updates: UpdateProfileRequest = req.body;
    const hasName = Object.prototype.hasOwnProperty.call(updates, 'name');
    const hasBirthDate = Object.prototype.hasOwnProperty.call(updates, 'birthDate');
    const normalizedName = hasName ? normalizeOptionalField(updates.name) : undefined;
    const normalizedBirthDate = hasBirthDate ? normalizeOptionalField(updates.birthDate) : undefined;

    if (hasName && !normalizedName) {
      return res.status(400).json({ error: 'name must be non-empty when provided' });
    }

    if (hasBirthDate && !normalizedBirthDate) {
      return res.status(400).json({ error: 'birthDate must be non-empty when provided' });
    }
    
    // Get existing profile
    const existingResult = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    
    if (existingResult.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    
    const existingProfile: UserProfile = JSON.parse(existingResult[0]!.profileJson);

    const normalizedUpdates: UpdateProfileRequest = {
      ...updates,
      ...(hasName ? { name: normalizedName } : {}),
      ...(hasBirthDate ? { birthDate: normalizedBirthDate } : {}),
    };
    
    // Update profile with new values
    const updated: UserProfile = {
      ...existingProfile,
      ...normalizedUpdates,
      updatedAt: new Date().toISOString(),
    };

    // Update in database
    await db
      .update(profiles)
      .set({
        profileJson: JSON.stringify(updated),
        updatedAt: new Date(updated.updatedAt),
      })
      .where(eq(profiles.id, id));

    devLogger.info('api', 'Profile updated', { profileId: id });
    
    res.json(updated);
  } catch (error) {
    devLogger.error('api', 'Failed to update profile', { error: String(error) });
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// DELETE /api/profile/:id
profileRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    // Check if profile exists
    const existingResult = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    
    if (existingResult.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    
    // Delete from database
    await db.delete(profiles).where(eq(profiles.id, id));
    
    devLogger.info('api', 'Profile deleted', { profileId: id });
    
    res.json({ ok: true });
  } catch (error) {
    devLogger.error('api', 'Failed to delete profile', { error: String(error) });
    res.status(500).json({ error: 'internal_server_error' });
  }
});
