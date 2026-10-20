const SB = process.env.SUPABASE_URL, SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const LIMITS = { image: [8, 24], video: [2, 24], sticker: [10, 24], chat: [30, 1] }; // [max, jam]

export const db = (path, opts = {}) => fetch(`${SB}/rest/v1/${path}`, {
  ...opts, headers: { apikey: SRK, Authorization: `Bearer ${SRK}`, 'Content-Type': 'application/json', ...opts.headers }
});

// Cek origin + method + login. Return user {id,email} atau null (response sudah dikirim).
export async function guard(req, res) {
  const allowed = process.env.ALLOWED_ORIGIN, origin = req.headers.origin;
  if (allowed && origin && origin !== allowed) { res.status(403).json({ error: 'Origin tidak diizinkan' }); return null; }
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return null; }
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) { res.status(401).json({ error: 'Login dulu' }); return null; }
  const r = await fetch(`${SB}/auth/v1/user`, { headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
  if (!r.ok) { res.status(401).json({ error: 'Sesi habis, login ulang' }); return null; }
  return await r.json();
}

// Limit per akun: hitung baris milik user dalam N jam terakhir
export async function limit(res, user, kind) {
  const [max, hours] = LIMITS[kind];
  const since = new Date(Date.now() - hours * 3600e3).toISOString();
  const q = kind === 'chat'
    ? `chat_messages?user_id=eq.${user.id}&role=eq.user&created_at=gte.${since}&select=id`
    : `generations?user_id=eq.${user.id}&kind=eq.${kind}&created_at=gte.${since}&select=id`;
  const r = await db(q, { method: 'HEAD', headers: { Prefer: 'count=exact' } });
  const n = +((r.headers.get('content-range') || '0/0').split('/')[1]);
  if (n >= max) { res.status(429).json({ error: `Limit akun tercapai: ${max}x per ${hours} jam.` }); return false; }
  return true;
}

export const checkDataUrl = (s, max = 3e6) => { const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(s || ''); return !!m && m[2].length * 0.75 <= max; };
export const checkHttps = (u) => { try { const x = new URL(u); return x.protocol === 'https:' && !/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(x.hostname); } catch { return false; } };

export async function replicate(model, input) {
  const [name, version] = model.split(':');
  const r = await fetch(version ? 'https://api.replicate.com/v1/predictions' : `https://api.replicate.com/v1/models/${name}/predictions`, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(version ? { version, input } : { input })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.detail || 'Replicate error');
  return d.id;
}
export const saveGen = (row) => db('generations', { method: 'POST', body: JSON.stringify(row) });
