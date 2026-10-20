import { guard, db } from './_lib.js';

export default async function handler(req, res) {
  const user = await guard(req, res); if (!user) return;
  try {
    const id = String(req.body?.id || '');
    if (!/^[a-z0-9]{10,40}$/.test(id)) return res.status(400).json({ error: 'ID tidak valid' });
    const row = (await (await db(`generations?prediction_id=eq.${id}&user_id=eq.${user.id}&select=*`)).json())[0];
    if (!row) return res.status(404).json({ error: 'Tidak ditemukan' });
    if (row.status === 'done') return res.json({ status: 'succeeded', output: row.output_url });

    const d = await (await fetch(`https://api.replicate.com/v1/predictions/${id}`, { headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` } })).json();
    const patch = (b) => db(`generations?id=eq.${row.id}`, { method: 'PATCH', body: JSON.stringify(b) });
    if (d.status === 'failed' || d.status === 'canceled') { await patch({ status: 'failed' }); return res.json({ status: 'failed' }); }
    if (d.status !== 'succeeded') return res.json({ status: d.status });

    let out = Array.isArray(d.output) ? d.output[0] : d.output;
    if (row.kind !== 'video') { // simpan permanen di Supabase Storage (URL Replicate kedaluwarsa ~1 jam)
      try {
        const f = await fetch(out); const type = f.headers.get('content-type') || 'image/png';
        const path = `${user.id}/${id}.${type.includes('webp') ? 'webp' : type.includes('jpeg') ? 'jpg' : 'png'}`;
        const up = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/results/${path}`, {
          method: 'POST', headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': type, 'x-upsert': 'true' },
          body: Buffer.from(await f.arrayBuffer())
        });
        if (up.ok) out = `${process.env.SUPABASE_URL}/storage/v1/object/public/results/${path}`;
      } catch {}
    }
    await patch({ status: 'done', output_url: out });
    res.json({ status: 'succeeded', output: out });
  } catch { res.status(500).json({ error: 'Gagal cek status' }); }
}
