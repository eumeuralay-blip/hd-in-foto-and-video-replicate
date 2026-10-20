import { guard, limit, replicate, saveGen } from './_lib.js';

export default async function handler(req, res) {
  const user = await guard(req, res); if (!user) return;
  try {
    const prompt = String(req.body?.prompt || '').trim();
    if (prompt.length < 3 || prompt.length > 200) return res.status(400).json({ error: 'Prompt 3-200 karakter' });
    if (!(await limit(res, user, 'sticker'))) return;
    const id = await replicate(process.env.STICKER_MODEL || 'fofr/sticker-maker', { prompt, steps: 17, width: 1024, height: 1024 });
    await saveGen({ user_id: user.id, kind: 'sticker', prediction_id: id, prompt });
    res.json({ id });
  } catch { res.status(500).json({ error: 'Gagal membuat sticker' }); }
}
