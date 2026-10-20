import { guard, limit, db } from './_lib.js';

const SYSTEM = 'Kamu asisten AI untuk website HD Studio (HD foto/video & sticker maker). Jawab singkat, ramah, bahasa Indonesia.';
const providers = [
  { url: 'https://api.groq.com/openai/v1/chat/completions', key: () => process.env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' },
  { url: 'https://openrouter.ai/api/v1/chat/completions', key: () => process.env.OPENROUTER_API_KEY, model: 'meta-llama/llama-3.3-70b-instruct:free' }
];

export default async function handler(req, res) {
  const user = await guard(req, res); if (!user) return;
  const text = String(req.body?.message || '').trim().slice(0, 1000);
  if (!text) return res.status(400).json({ error: 'Pesan kosong' });
  if (!(await limit(res, user, 'chat'))) return;
  // Riwayat diambil dari database (bukan dari klien) supaya tidak bisa dimanipulasi
  const past = (await (await db(`chat_messages?user_id=eq.${user.id}&order=created_at.desc&limit=10&select=role,content`)).json()).reverse();
  const messages = [{ role: 'system', content: SYSTEM }, ...past, { role: 'user', content: text }];
  for (const p of providers) {
    if (!p.key()) continue;
    try {
      const r = await fetch(p.url, { method: 'POST', headers: { Authorization: `Bearer ${p.key()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: p.model, max_tokens: 500, messages }) });
      if (!r.ok) continue;
      const reply = (await r.json()).choices?.[0]?.message?.content || '...';
      const t = Date.now();
      await db('chat_messages', { method: 'POST', body: JSON.stringify([
        { user_id: user.id, role: 'user', content: text, created_at: new Date(t).toISOString() },
        { user_id: user.id, role: 'assistant', content: reply, created_at: new Date(t + 1).toISOString() }]) });
      return res.json({ reply });
    } catch {}
  }
  res.status(503).json({ error: 'AI sedang sibuk, coba lagi' });
}
