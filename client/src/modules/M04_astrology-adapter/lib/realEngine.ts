/**
 * Real Astrology Engine using astronomical calculations.
 * Replaces the StubAstrologyEngine with actual planetary positions
 * computed from JPL orbital elements and Meeus algorithms.
 */

import type {
  AstrologyRequest,
  AstrologyResult,
  PlanetKey,
  PlanetPosition,
  AnglePosition,
  HouseCusp,
  Aspect,
} from '../../../shared/types/astrology';
import type { AstrologyEngine } from './astrologyEngine';
import {
  julianDay,
  planetGeocentricLon,
  lunarLongitude,
  blackMoonLilithLon,
  chironLon,
  isRetrograde,
  computeAscMc,
  equalHouseCusps,
  wholeSignCusps,
  findHouse,
  detectAspect,
  lonToZodiac,
} from './astronomy';
import { geocodeCity, birthToUT } from './geocode';

const PLANET_KEYS: PlanetKey[] = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  'chiron', 'lilith',
];

function getPlanetLon(key: PlanetKey, jd: number): number {
  switch (key) {
    case 'moon': return lunarLongitude(jd);
    case 'lilith': return blackMoonLilithLon(jd);
    case 'chiron': return chironLon(jd);
    default: return planetGeocentricLon(key, jd);
  }
}

export class RealAstrologyEngine implements AstrologyEngine {
  async compute(req: AstrologyRequest): Promise<AstrologyResult> {
    const warnings: string[] = [];
    const geo = req.location
      ? { lat: req.location.latitude, lon: req.location.longitude, tzOffsetHours: 1 }
      : geocodeCity(req.birthPlace);

    const ut = birthToUT(req.birthDate, req.birthTime, geo);
    const jd = julianDay(ut.year, ut.month, ut.day, ut.hourUT);

    if (!ut.hasTime) {
      warnings.push('Keine Geburtszeit angegeben — Mittag (12:00 UT) verwendet. Mondzeichen und Häuser können abweichen.');
    }

    // Compute planet longitudes
    let planets: PlanetPosition[] | undefined;
    let cusps: number[] | undefined;

    if (req.include.planets) {
      const lons = new Map<PlanetKey, number>();

      for (const key of PLANET_KEYS) {
        lons.set(key, getPlanetLon(key, jd));
      }

      // Houses (need geo for ASC)
      if (req.include.houses && geo && ut.hasTime) {
        const { asc } = computeAscMc(jd, geo.lat, geo.lon);
        cusps = req.houseSystem === 'whole_sign'
          ? wholeSignCusps(asc)
          : equalHouseCusps(asc);
      } else if (req.include.houses) {
        if (!geo) warnings.push('Geburtsort nicht erkannt — Häuser nicht berechenbar.');
        if (!ut.hasTime) warnings.push('Häuserberechnung benötigt Geburtszeit.');
      }

      planets = PLANET_KEYS.map((key) => {
        const lon = lons.get(key)!;
        const retro = key === 'sun' || key === 'moon' ? false : isRetrograde(key, jd);
        return {
          key,
          pos: lonToZodiac(lon),
          house: cusps ? findHouse(lon, cusps) : undefined,
          retro,
        };
      });
    }

    // Angles
    let angles: AnglePosition[] | undefined;
    if (req.include.angles && geo && ut.hasTime) {
      const { asc, mc } = computeAscMc(jd, geo.lat, geo.lon);
      angles = [
        { key: 'asc', pos: lonToZodiac(asc) },
        { key: 'mc', pos: lonToZodiac(mc) },
      ];
    } else if (req.include.angles) {
      if (!geo) warnings.push('ASC/MC benötigen einen erkannten Geburtsort.');
      if (!ut.hasTime) warnings.push('ASC/MC benötigen die Geburtszeit.');
    }

    // Houses
    let houses: HouseCusp[] | undefined;
    if (cusps) {
      houses = cusps.map((lon, i) => ({
        house: i + 1,
        pos: lonToZodiac(lon),
      }));
    }

    // Aspects
    let aspects: Aspect[] | undefined;
    if (req.include.aspects && planets) {
      aspects = [];
      const keys: (PlanetKey | 'asc' | 'mc')[] = [...PLANET_KEYS];
      const lonMap = new Map<string, number>();

      for (const p of planets) {
        lonMap.set(p.key, p.pos.lon);
      }
      if (angles) {
        for (const a of angles) {
          keys.push(a.key);
          lonMap.set(a.key, a.pos.lon);
        }
      }

      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          const a = keys[i]!;
          const b = keys[j]!;
          const lonA = lonMap.get(a);
          const lonB = lonMap.get(b);
          if (lonA === undefined || lonB === undefined) continue;

          const asp = detectAspect(lonA, lonB);
          if (asp) {
            aspects.push({
              a: a as Aspect['a'],
              b: b as Aspect['b'],
              type: asp.type,
              orb: asp.orb,
              exact: asp.orb < 1,
            });
          }
        }
      }
    }

    if (!geo && req.birthPlace) {
      warnings.push(`Geburtsort "${req.birthPlace}" nicht in Datenbank — erweitere geocode.ts oder gib Koordinaten an.`);
    }

    return {
      profileId: req.profileId,
      meta: {
        engine: 'swiss_ephemeris',
        engineVersion: 'meeus-jpl-1.0',
        system: req.system,
        houseSystem: req.houseSystem,
        computedAt: new Date().toISOString(),
        warnings: warnings.length > 0 ? warnings : undefined,
      },
      planets,
      angles,
      houses,
      aspects,
    };
  }
}
