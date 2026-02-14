import { useState } from 'react';
import { Button, Input } from '../../M02_ui-kit';
import type { UserProfile } from '../../../shared/types/profile';
import {
  validateProfileDraft,
  hasErrors,
  saveProfile,
  type ProfileDraft,
  type ProfileErrors,
} from '../lib/profileStorage';

interface ProfileFormProps {
  initialProfile?: UserProfile | null;
  onSaved: (profile: UserProfile) => void;
  onDelete?: () => void;
}

function draftFromProfile(p: UserProfile | null | undefined): ProfileDraft {
  return {
    name: p?.name ?? '',
    birthDate: p?.birthDate ?? '',
    birthTime: p?.birthTime ?? '',
    birthPlace: p?.birthPlace ?? '',
  };
}

export function ProfileForm({ initialProfile, onSaved, onDelete }: ProfileFormProps) {
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromProfile(initialProfile));
  const [errors, setErrors] = useState<ProfileErrors>({});

  const isRequiredEmpty = draft.name.trim().length === 0 || draft.birthDate.length === 0;

  function handleChange(field: keyof ProfileDraft, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleSubmit() {
    const validationErrors = validateProfileDraft(draft);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    const now = new Date().toISOString();
    const profile: UserProfile = {
      id: initialProfile?.id ?? crypto.randomUUID(),
      name: draft.name.trim(),
      birthDate: draft.birthDate,
      birthTime: draft.birthTime || undefined,
      birthPlace: draft.birthPlace || undefined,
      createdAt: initialProfile?.createdAt ?? now,
      updatedAt: now,
    };

    saveProfile(profile);
    onSaved(profile);
  }

  function handleReset() {
    setDraft(draftFromProfile(initialProfile));
    setErrors({});
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Input
          label="Name"
          type="text"
          placeholder="Dein Name"
          value={draft.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />
        {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
      </div>

      <div>
        <Input
          label="Geburtsdatum"
          type="date"
          value={draft.birthDate}
          onChange={(e) => handleChange('birthDate', e.target.value)}
        />
        {errors.birthDate && <p className="mt-1 text-sm text-red-400">{errors.birthDate}</p>}
      </div>

      <div>
        <Input
          label="Geburtszeit (optional)"
          type="time"
          value={draft.birthTime}
          onChange={(e) => handleChange('birthTime', e.target.value)}
        />
        {errors.birthTime && <p className="mt-1 text-sm text-red-400">{errors.birthTime}</p>}
      </div>

      <div>
        <Input
          label="Geburtsort (optional)"
          type="text"
          placeholder="z.B. Berlin"
          value={draft.birthPlace}
          onChange={(e) => handleChange('birthPlace', e.target.value)}
        />
        {errors.birthPlace && <p className="mt-1 text-sm text-red-400">{errors.birthPlace}</p>}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="primary" disabled={isRequiredEmpty} onClick={handleSubmit}>
          Speichern & Weiter
        </Button>
        <Button variant="secondary" onClick={handleReset}>
          Zurücksetzen
        </Button>
      </div>

      {initialProfile && onDelete && (
        <Button variant="secondary" size="sm" onClick={onDelete} className="mt-2">
          Profil löschen
        </Button>
      )}
    </div>
  );
}
