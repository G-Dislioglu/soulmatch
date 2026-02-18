import { useEffect, useRef, useState } from 'react';
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
  focusField?: 'birthTime' | 'birthLocation';
}

interface GeoAutocompleteItem {
  label: string;
  lat: number;
  lon: number;
  countryCode: string;
  timezone?: string;
}

function draftFromProfile(p: UserProfile | null | undefined): ProfileDraft {
  return {
    name: p?.name ?? '',
    birthDate: p?.birthDate ?? '',
    birthTime: p?.birthTime ?? '',
    birthPlace: p?.birthPlace ?? '',
  };
}

export function ProfileForm({ initialProfile, onSaved, onDelete, focusField }: ProfileFormProps) {
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromProfile(initialProfile));
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [selectedLocation, setSelectedLocation] = useState<GeoAutocompleteItem | null>(
    initialProfile?.birthLocation ?? null,
  );
  const [suggestions, setSuggestions] = useState<GeoAutocompleteItem[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const requestSeqRef = useRef(0);
  const birthTimeRef = useRef<HTMLInputElement>(null);
  const birthPlaceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusField === 'birthTime') {
      birthTimeRef.current?.focus();
      birthTimeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (focusField === 'birthLocation') {
      birthPlaceRef.current?.focus();
      birthPlaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusField]);

  const isRequiredEmpty = draft.name.trim().length === 0 || draft.birthDate.length === 0;

  function handleChange(field: keyof ProfileDraft, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }));
    if (field === 'birthPlace') {
      setSelectedLocation(null);
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  useEffect(() => {
    const q = draft.birthPlace.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLookupLoading(false);
      return;
    }

    const requestId = ++requestSeqRef.current;
    setLookupLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/geo/autocomplete?q=${encodeURIComponent(q)}`);
        const data = await response.json().catch(() => ({ items: [] })) as { items?: GeoAutocompleteItem[] };
        if (requestSeqRef.current !== requestId) return;
        if (!response.ok || !Array.isArray(data.items)) {
          setSuggestions([]);
          return;
        }
        setSuggestions(data.items);
      } catch {
        if (requestSeqRef.current === requestId) setSuggestions([]);
      } finally {
        if (requestSeqRef.current === requestId) setLookupLoading(false);
      }
    }, 240);

    return () => window.clearTimeout(timer);
  }, [draft.birthPlace]);

  function handleSelectLocation(item: GeoAutocompleteItem) {
    setSelectedLocation(item);
    setDraft((prev) => ({ ...prev, birthPlace: item.label }));
    setSuggestions([]);
    setLookupLoading(false);
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
      birthLocation: selectedLocation ?? undefined,
      timezone: selectedLocation?.timezone ?? initialProfile?.timezone,
      createdAt: initialProfile?.createdAt ?? now,
      updatedAt: now,
    };

    saveProfile(profile);
    onSaved(profile);
  }

  function handleReset() {
    setDraft(draftFromProfile(initialProfile));
    setSelectedLocation(initialProfile?.birthLocation ?? null);
    setSuggestions([]);
    setLookupLoading(false);
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
          ref={birthTimeRef}
        />
        <p className="mt-1 text-xs text-[color:var(--muted-fg)]">Aktiv in PR3 (Häuser/Angles) – aktuell nur Profil-Daten.</p>
        {errors.birthTime && <p className="mt-1 text-sm text-red-400">{errors.birthTime}</p>}
      </div>

      <div>
        <Input
          label="Geburtsort (optional)"
          type="text"
          placeholder="z.B. Berlin"
          value={draft.birthPlace}
          onChange={(e) => handleChange('birthPlace', e.target.value)}
          ref={birthPlaceRef}
        />
        {lookupLoading && <p className="mt-1 text-xs text-[color:var(--muted-fg)]">Suche Orte…</p>}
        {!lookupLoading && suggestions.length > 0 && (
          <div className="mt-2 rounded-md border border-white/10 bg-black/20 p-1">
            {suggestions.map((item) => (
              <button
                type="button"
                key={`${item.label}-${item.lat}-${item.lon}`}
                onClick={() => handleSelectLocation(item)}
                className="w-full text-left rounded px-2 py-1 text-sm text-[color:var(--fg)] hover:bg-white/10"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
        {selectedLocation && (
          <p className="mt-1 text-xs text-[color:var(--muted-fg)]">
            Ausgewählt: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lon.toFixed(4)}
          </p>
        )}
        {!selectedLocation && (
          <p className="mt-1 text-xs text-[color:var(--muted-fg)]">Ort wählen für Koordinaten (Geo Autocomplete).</p>
        )}
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
