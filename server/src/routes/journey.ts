import { Router, type Request, type Response } from 'express';
import { createRequire } from 'module';

type SwephLib = Record<string, (...args: number[]) => unknown>;

let _swephCache: SwephLib | null | undefined = undefined;

function loadSweph(): SwephLib | null {
  if (_swephCache !== undefined) return _swephCache;
  try {
    const req = createRequire(import.meta.url);
    let sw = req('sweph') as SwephLib;
    if (sw['default'] && typeof sw['default'] === 'object') sw = sw['default'] as SwephLib;
    _swephCache = sw;
    return sw;
  } catch {
    _swephCache = null;
    return null;
  }
}

export const journeyRouter = Router();

export type JourneyEventType = 'travel'|'new_project'|'job_change'|'relationship'|'move'|'health'|'financial'|'creative'|'learning'|'spiritual';
export interface PlanetaryInfluence { planet: string; aspect: string; influence: 'supportive'|'challenging'|'neutral'; description: string; }
export interface OptimalDate { date: string; score: number; rating: 'excellent'|'good'|'moderate'|'challenging'; planetaryInfluences: PlanetaryInfluence[]; summary: string; moonPhase: string; dayOfWeek: string; }
export interface JourneyRequest { eventType: JourneyEventType; startDate: string; endDate: string; birthDate: string; birthTime?: string; }
export interface JourneyResponse { eventType: JourneyEventType; optimalDates: OptimalDate[]; generalAdvice: string; avoidDates: string[]; }

const SE_SUN=0, SE_MOON=1, SE_MERCURY=2, SE_VENUS=3, SE_MARS=4, SE_JUPITER=5, SE_SATURN=6;
const DAY_DE = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
const EVENT_LABELS: Record<JourneyEventType,string> = { travel:'Reise', new_project:'Neues Projekt', job_change:'Jobwechsel', relationship:'Beziehung', move:'Umzug', health:'Gesundheit', financial:'Finanzen', creative:'Kreativität', learning:'Lernen', spiritual:'Spiritualität' };

const WEIGHTS: Record<JourneyEventType, number[]> = {
  travel:       [1,2,3,1,1,3,-1],
  new_project:  [2,1,2,1,3,2,1],
  job_change:   [3,1,2,1,2,3,2],
  relationship: [1,3,1,3,1,2,-1],
  move:         [1,3,1,2,2,2,1],
  health:       [2,2,1,1,2,2,1],
  financial:    [2,1,2,2,1,3,2],
  creative:     [2,2,1,3,2,2,-1],
  learning:     [1,1,3,1,1,3,2],
  spiritual:    [2,3,1,2,-1,3,1],
};

const ASPECTS = [{a:0,o:8,h:0.5},{a:60,o:4,h:0.8},{a:90,o:7,h:-0.6},{a:120,o:8,h:1.0},{a:180,o:8,h:-0.4}];
const ASPECT_NAMES = ['Konjunktion','Sextil','Quadrat','Trigon','Opposition'];
const MOON_DE: Record<string,string> = { new_moon:'Neumond', waxing_crescent:'Zunehmende Sichel', first_quarter:'Erstes Viertel', waxing_gibbous:'Zunehmender Mond', full_moon:'Vollmond', waning_gibbous:'Abnehmender Mond', last_quarter:'Letztes Viertel', waning_crescent:'Abnehmende Sichel' };

type Sweph = Record<string, (...args: number[]) => { data?: number[] } | { year?:number; month?:number; day?:number } | number>;

function lon(sw: Sweph, jd: number, pid: number): number {
  try { const r = sw['calc_ut'](jd, pid, 0) as { data: number[] }; return r?.data?.[0] ?? 0; } catch { return 0; }
}
function jd(sw: Sweph, y:number,m:number,d:number,h:number): number {
  return (sw['julday'] as (...args:number[])=>number)(y,m,d,h,1);
}
function moonPhase(sun:number, moon:number): string {
  const d=(moon-sun+360)%360;
  if(d<22.5) return 'new_moon'; if(d<67.5) return 'waxing_crescent'; if(d<112.5) return 'first_quarter';
  if(d<157.5) return 'waxing_gibbous'; if(d<202.5) return 'full_moon'; if(d<247.5) return 'waning_gibbous';
  if(d<292.5) return 'last_quarter'; return 'waning_crescent';
}
function aspect(l1:number,l2:number): {name:string;h:number}|null {
  let d=Math.abs(l1-l2); if(d>180) d=360-d;
  for(let i=0;i<ASPECTS.length;i++) { const a=ASPECTS[i]; if(Math.abs(d-a.a)<=a.o) return {name:ASPECT_NAMES[i],h:a.h}; }
  return null;
}
function rating(s:number): 'excellent'|'good'|'moderate'|'challenging' {
  return s>=75?'excellent':s>=60?'good':s>=45?'moderate':'challenging';
}

// Deterministic moon phase approximation (no sweph needed)
function approxMoonPhase(dateMs: number): string {
  const REF = new Date('2000-01-06').getTime(); // known new moon
  const CYCLE = 29.53 * 86400000;
  const phase = ((dateMs - REF) % CYCLE + CYCLE) % CYCLE / CYCLE;
  if (phase < 0.0625) return 'new_moon';
  if (phase < 0.25)   return 'waxing_crescent';
  if (phase < 0.375)  return 'first_quarter';
  if (phase < 0.5)    return 'waxing_gibbous';
  if (phase < 0.5625) return 'full_moon';
  if (phase < 0.75)   return 'waning_gibbous';
  if (phase < 0.875)  return 'last_quarter';
  return 'waning_crescent';
}

// Approximate sun longitude from date (degrees, tropical)
function approxSunLon(dateMs: number): number {
  const J2000 = 2451545.0;
  const jd = dateMs / 86400000 + 2440587.5;
  const n = jd - J2000;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;
  return (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g) + 360) % 360;
}

// Approximate planet longitudes (mean, good enough for scoring)
function approxPlanetLons(dateMs: number): Record<string, number> {
  const J2000 = 2451545.0;
  const jd = dateMs / 86400000 + 2440587.5;
  const n = jd - J2000;
  return {
    mercury: (252.25 + 4.09233 * n) % 360,
    venus:   (181.98 + 1.60213 * n) % 360,
    mars:    (355.43 + 0.52403 * n) % 360,
    jupiter: (34.33  + 0.08309 * n) % 360,
    saturn:  (50.08  + 0.03346 * n) % 360,
  };
}

function calculateFallback(req: JourneyRequest): JourneyResponse {
  const [by, bm, bd] = req.birthDate.split('-').map(Number);
  const birthMs = new Date(`${by}-${String(bm).padStart(2,'0')}-${String(bd).padStart(2,'0')}T12:00:00Z`).getTime();
  const natalSun = approxSunLon(birthMs);

  const start = new Date(req.startDate + 'T12:00:00Z');
  const maxDays = Math.min(Math.ceil((new Date(req.endDate + 'T12:00:00Z').getTime() - start.getTime()) / 86400000) + 1, 90);
  const w = WEIGHTS[req.eventType];
  const allDates: OptimalDate[] = [];
  const avoidDates: string[] = [];

  for (let i = 0; i < maxDays; i++) {
    const cur = new Date(start.getTime() + i * 86400000);
    const ds = cur.toISOString().slice(0, 10);
    const mp = approxMoonPhase(cur.getTime());
    const plons = approxPlanetLons(cur.getTime());
    let score = 50;
    const infl: PlanetaryInfluence[] = [];

    if ((mp === 'new_moon' || mp === 'waxing_crescent') && ['new_project','creative','learning'].includes(req.eventType)) {
      score += 10; infl.push({ planet:'Mond', aspect: MOON_DE[mp], influence:'supportive', description:'Neue Anfänge begünstigt.' });
    } else if (mp === 'full_moon') {
      if (['relationship','spiritual'].includes(req.eventType)) { score += 8; infl.push({ planet:'Mond', aspect:'Vollmond', influence:'supportive', description:'Emotionale Erfüllung.' }); }
      else score -= 5;
    }

    const planets: [number, string, number, number, string, string][] = [
      [plons.jupiter, 'Jupiter', w[5], 5, 'Glück und Expansion', 'Übertreibung möglich'],
      [plons.venus,   'Venus',   w[3], 4, 'Harmonie und Anziehung', 'Spannungen möglich'],
      [plons.mars,    'Mars',    w[4], 3, 'Energie und Antrieb', 'Konflikte möglich'],
      [plons.mercury, 'Merkur',  w[2], 3, 'Kommunikation fließt', 'Missverständnisse möglich'],
      [plons.saturn,  'Saturn',  w[6], 3, 'Struktur und Ausdauer', 'Verzögerungen möglich'],
    ];
    for (const [pl, name, wt, f, pos, neg] of planets) {
      if (wt === 0) continue;
      const asp = aspect(pl, natalSun);
      if (!asp) continue;
      score += asp.h * wt * f;
      if (Math.abs(asp.h) > 0.3) infl.push({ planet: name, aspect: asp.name, influence: asp.h > 0 ? 'supportive' : 'challenging', description: asp.h > 0 ? pos : neg });
    }
    const dow = cur.getUTCDay();
    if (dow === 4 && ['travel','new_project','financial'].includes(req.eventType)) score += 3;
    if (dow === 5 && ['relationship','creative'].includes(req.eventType)) score += 3;
    if (dow === 2 && ['new_project','job_change'].includes(req.eventType)) score += 2;
    score = Math.max(0, Math.min(100, score));
    const r = rating(score);
    if (r === 'challenging') avoidDates.push(ds);
    const sup = infl.filter(x => x.influence === 'supportive'), cha = infl.filter(x => x.influence === 'challenging');
    let summary = '';
    if (r === 'excellent') summary = `Exzellenter Tag! ${sup.map(x => x.planet).join(' und ')} unterstützen dich.`;
    else if (r === 'good') summary = 'Guter Zeitpunkt mit positiven Einflüssen.';
    else if (r === 'moderate') summary = 'Gemischte Energien – bewusste Planung empfohlen.';
    else summary = cha.length > 0 ? `Herausfordernder Tag – ${cha[0].description}` : 'Weniger günstiger Zeitpunkt.';
    allDates.push({ date: ds, score, rating: r, planetaryInfluences: infl, summary, moonPhase: MOON_DE[mp] ?? mp, dayOfWeek: DAY_DE[dow] });
  }

  const optimal = allDates.filter(d => d.rating !== 'challenging').sort((a, b) => b.score - a.score).slice(0, 10);
  const key = req.eventType === 'relationship' ? 'Venus' : req.eventType === 'new_project' ? 'Mars' : req.eventType === 'travel' ? 'Merkur' : 'den Mondphasen';
  const advice = `Für ${EVENT_LABELS[req.eventType]} sind Jupiter und ${key} besonders wichtig. Natal-Sonne bei ca. ${natalSun.toFixed(1)}°.`;
  return { eventType: req.eventType, optimalDates: optimal, generalAdvice: advice, avoidDates: avoidDates.slice(0, 5) };
}

function calculate(req: JourneyRequest): JourneyResponse {
  const sw = loadSweph() as unknown as Sweph;
  if (!sw) return calculateFallback(req);

  const [by,bm,bd]=req.birthDate.split('-').map(Number);
  const [bh=12,bmn=0]=(req.birthTime??'12:00').split(':').map(Number);
  const birthJd = jd(sw,by,bm,bd,bh+bmn/60);
  const natalSun = lon(sw,birthJd,SE_SUN);

  const start=new Date(req.startDate+'T12:00:00Z');
  const maxDays=Math.min(Math.ceil((new Date(req.endDate+'T12:00:00Z').getTime()-start.getTime())/86400000)+1,90);
  const w=WEIGHTS[req.eventType];
  const allDates: OptimalDate[]=[];
  const avoidDates: string[]=[];

  for(let i=0;i<maxDays;i++){
    const cur=new Date(start.getTime()+i*86400000);
    const [cy,cm,cday]=[cur.getUTCFullYear(),cur.getUTCMonth()+1,cur.getUTCDate()];
    const dayJd=jd(sw,cy,cm,cday,12);
    const ds=cur.toISOString().slice(0,10);
    const sunL=lon(sw,dayJd,SE_SUN), moonL=lon(sw,dayJd,SE_MOON);
    const merL=lon(sw,dayJd,SE_MERCURY), venL=lon(sw,dayJd,SE_VENUS);
    const marL=lon(sw,dayJd,SE_MARS), jupL=lon(sw,dayJd,SE_JUPITER), satL=lon(sw,dayJd,SE_SATURN);
    let score=50; const infl: PlanetaryInfluence[]=[];
    const mp=moonPhase(sunL,moonL);
    if((mp==='new_moon'||mp==='waxing_crescent')&&['new_project','creative','learning'].includes(req.eventType)){score+=10;infl.push({planet:'Mond',aspect:MOON_DE[mp],influence:'supportive',description:'Neue Anfänge begünstigt.'});}
    else if(mp==='full_moon'){if(['relationship','spiritual'].includes(req.eventType)){score+=8;infl.push({planet:'Mond',aspect:'Vollmond',influence:'supportive',description:'Emotionale Erfüllung.'});}else score-=5;}
    const planets: [number,string,number,number,string,string][]=[
      [jupL,'Jupiter',w[5],5,'Glück und Expansion','Übertreibung möglich'],
      [venL,'Venus',  w[3],4,'Harmonie und Anziehung','Spannungen möglich'],
      [marL,'Mars',   w[4],3,'Energie und Antrieb','Konflikte möglich'],
      [merL,'Merkur', w[2],3,'Kommunikation fließt','Missverständnisse möglich'],
      [satL,'Saturn', w[6],3,'Struktur und Ausdauer','Verzögerungen möglich'],
    ];
    for(const [pl,name,wt,f,pos,neg] of planets){
      if(wt===0) continue;
      const asp=aspect(pl,natalSun);
      if(!asp) continue;
      score+=asp.h*wt*f;
      if(Math.abs(asp.h)>0.3) infl.push({planet:name,aspect:asp.name,influence:asp.h>0?'supportive':'challenging',description:asp.h>0?pos:neg});
    }
    const dow=cur.getUTCDay();
    if(dow===4&&['travel','new_project','financial'].includes(req.eventType)) score+=3;
    if(dow===5&&['relationship','creative'].includes(req.eventType)) score+=3;
    if(dow===2&&['new_project','job_change'].includes(req.eventType)) score+=2;
    score=Math.max(0,Math.min(100,score));
    const r=rating(score);
    if(r==='challenging') avoidDates.push(ds);
    const sup=infl.filter(x=>x.influence==='supportive'), cha=infl.filter(x=>x.influence==='challenging');
    let summary='';
    if(r==='excellent') summary=`Exzellenter Tag! ${sup.map(x=>x.planet).join(' und ')} unterstützen dich.`;
    else if(r==='good') summary='Guter Zeitpunkt mit positiven Einflüssen.';
    else if(r==='moderate') summary='Gemischte Energien – bewusste Planung empfohlen.';
    else summary=cha.length>0?`Herausfordernder Tag – ${cha[0].description}`:'Weniger günstiger Zeitpunkt.';
    allDates.push({date:ds,score,rating:r,planetaryInfluences:infl,summary,moonPhase:MOON_DE[mp]??mp,dayOfWeek:DAY_DE[dow]});
  }

  const optimal=allDates.filter(d=>d.rating!=='challenging').sort((a,b)=>b.score-a.score).slice(0,10);
  const key=req.eventType==='relationship'?'Venus':req.eventType==='new_project'?'Mars':req.eventType==='travel'?'Merkur':'den Mondphasen';
  const advice=`Für ${EVENT_LABELS[req.eventType]} sind Jupiter und ${key} besonders wichtig. Achte auf harmonische Aspekte zu deiner Natal-Sonne (${natalSun.toFixed(1)}°).`;
  return {eventType:req.eventType, optimalDates:optimal, generalAdvice:advice, avoidDates:avoidDates.slice(0,5)};
}

// POST /api/journey/optimal-dates
journeyRouter.post('/optimal-dates', (req: Request, res: Response) => {
  try {
    const body = req.body as JourneyRequest;
    const eventType = (body.eventType ?? '').trim();
    const startDate = (body.startDate ?? '').trim();
    const endDate = (body.endDate ?? '').trim();
    const birthDate = (body.birthDate ?? '').trim();
    if(!eventType||!startDate||!endDate||!birthDate) {
      res.status(400).json({error:'invalid_request', message:'eventType, startDate, endDate, birthDate required'});
      return;
    }
    const result = calculate({...body, eventType: eventType as JourneyEventType, startDate, endDate, birthDate});
    res.json(result);
  } catch(e) {
    res.status(500).json({error:'calculation_failed', message:String(e)});
  }
});
