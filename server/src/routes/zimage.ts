import { Router } from 'express';

export const zimageRouter = Router();

// ── Prompts für die 6 Aetheria-Räume (aus Briefing) ──────────────────────────
const ROOM_PROMPTS: Record<string, string> = {
  stern: `Mystical observatory dome interior, circular stone room with massive telescope
pointing at starry sky through open roof, floating star projections and
constellation lines, deep indigo and soft blue lighting with golden accent beams,
nebula particles floating in air, ancient astrolabe on stone pedestal,
star charts on curved walls, cinematic volumetric light, matte painting style,
dark cosmic atmosphere, illustrated fantasy art, NOT photorealistic`,

  turm: `Ancient mystical tower interior, tall octagonal chamber with floating glowing
numerals and geometric symbols, warm golden light against deep violet shadows,
stone tablets with carved numbers on walls, crystal sphere in center pulsing
with purple energy, sacred geometry patterns on floor, dust particles in light
beams, cinematic soft lighting, matte painting style, spiritual atmosphere,
illustrated fantasy art, NOT photorealistic`,

  rat: `Grand mystical council chamber, circular room with ornate round table in center,
four distinct ornate chairs around table, warm golden candlelight, tapestries on
stone walls depicting celestial scenes, floating golden dust motes, vaulted
ceiling with painted constellations, atmosphere of ancient wisdom, matte painting
style, dark warm tones with gold highlights, illustrated fantasy art, NOT
photorealistic`,

  mond: `Enchanted forest clearing at night with full moon overhead, ancient stone altar
with tarot cards spread on silk cloth, three tall candles with warm flickering
flames, celtic stone circle in background, soft moonbeams filtering through
ancient trees, fireflies and gentle fog, mystical but peaceful atmosphere,
warm cream and gold tones, matte painting style, illustrated fantasy art,
NOT photorealistic`,

  krist: `Underground crystal cave garden, seven tall glowing crystal pillars in rainbow
colors arranged in circle, still reflective pool in center, bioluminescent
plants and vines, green and teal ambient light, crystal formations catching
and refracting light beams, meditation stone platform, ethereal and healing
atmosphere, matte painting style, illustrated fantasy art, NOT photorealistic`,

  hall: `Vast mystical hall with impossibly high ceiling, floating luminous orbs in
various colors drifting through space, reflective dark water floor creating
mirror effect, ritual circle etched in glowing cyan lines on floor, timeline
spiral carved into distant walls, cool cyan and deep blue lighting,
cathedral-like sacred atmosphere, matte painting style, illustrated fantasy art,
NOT photorealistic`,
};

// ── Prompts für Persona-Portraits ────────────────────────────────────────────
const PERSONA_PROMPTS: Record<string, string> = {
  maya: `Ethereal spiritual guide woman, warm golden aura surrounding her silhouette,
flowing robes in deep purple and gold, eyes closed in meditation, floating
sacred geometry symbols around her, soft divine light from above, mystical
cosmic background with stars, compassionate and wise expression, illustrated
fantasy art, matte painting style, vertical portrait composition, NOT photorealistic`,

  luna: `Mystical moon goddess woman, silver and blue luminescent glow, crescent moon
crown, flowing translucent robes like moonlight, surrounded by floating water
droplets and moonbeams, serene and intuitive expression, deep night sky
background with full moon, illustrated fantasy art, matte painting style,
vertical portrait composition, NOT photorealistic`,

  orion: `Wise celestial strategist man, deep blue and starlight aura, constellation
patterns on his robes, analytical calm expression, surrounded by floating
geometric star maps and cosmic equations, deep space background with nebula,
rational and powerful presence, illustrated fantasy art, matte painting style,
vertical portrait composition, NOT photorealistic`,

  lilith: `Dark feminine shadow huntress, deep crimson and ember orange aura, fierce
and penetrating gaze, dark flowing robes with flame accents, surrounded by
shadow tendrils and glowing embers, dark mystical background, powerful and
intense presence, illustrated fantasy art, matte painting style, vertical
portrait composition, NOT photorealistic`,
};

// ── POST /api/zimage/generate ─────────────────────────────────────────────────
zimageRouter.post('/zimage/generate', async (req, res) => {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL_KEY not configured' });
  }

  const { type, id } = req.body as { type: string; id: string };

  if (type !== 'room' && type !== 'persona') {
    return res.status(400).json({ error: `Unknown type: ${type}` });
  }

  const prompts = type === 'room' ? ROOM_PROMPTS : PERSONA_PROMPTS;
  const prompt = prompts[id];

  if (!prompt) {
    return res.status(400).json({ error: `Unknown ${type} id: ${id}` });
  }

  try {
    const response = await fetch('https://fal.run/fal-ai/z-image/turbo', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
        image_size: type === 'room'
          ? { width: 800, height: 533 }   // Landscape für Räume
          : { width: 400, height: 600 },  // Portrait für Personas
        num_inference_steps: 28,
        guidance_scale: 7.5,
        num_images: 1,
        enable_safety_checker: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('fal.ai error:', err);
      return res.status(502).json({ error: 'fal.ai request failed', detail: err });
    }

    const data = await response.json() as { images: { url: string }[] };
    const imageUrl = data.images?.[0]?.url;

    if (!imageUrl) {
      return res.status(502).json({ error: 'No image in fal.ai response' });
    }

    return res.json({ url: imageUrl, type, id });
  } catch (err) {
    console.error('zimage error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// ── POST /api/zimage/batch ────────────────────────────────────────────────────
// Generiert alle Räume oder alle Personas auf einmal
zimageRouter.post('/zimage/batch', async (req, res) => {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL_KEY not configured' });
  }

  const { type } = req.body as { type: 'room' | 'persona' };
  const prompts = type === 'room' ? ROOM_PROMPTS : PERSONA_PROMPTS;
  const ids = Object.keys(prompts);

  const results: { id: string; url?: string; error?: string }[] = [];

  for (const id of ids) {
    try {
      const response = await fetch('https://fal.run/fal-ai/z-image/turbo', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompts[id].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
          image_size: type === 'room'
            ? { width: 800, height: 533 }
            : { width: 400, height: 600 },
          num_inference_steps: 28,
          guidance_scale: 7.5,
          num_images: 1,
          enable_safety_checker: true,
        }),
      });

      if (!response.ok) {
        results.push({ id, error: `HTTP ${response.status}` });
        continue;
      }

      const data = await response.json() as { images: { url: string }[] };
      const url = data.images?.[0]?.url;
      results.push({ id, url });
    } catch (err) {
      results.push({ id, error: String(err) });
    }
  }

  return res.json({ type, results });
});

// ── GET /api/zimage/prompts ───────────────────────────────────────────────────
// Gibt alle verfügbaren Prompts zurück (für Debug/Preview)
zimageRouter.get('/zimage/prompts', (_req, res) => {
  res.json({
    rooms: Object.keys(ROOM_PROMPTS),
    personas: Object.keys(PERSONA_PROMPTS),
  });
});
