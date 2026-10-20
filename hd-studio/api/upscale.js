import { guard, limit, checkDataUrl, checkHttps, replicate, saveGen } from './_lib.js';
export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

export default async function handler(req, res) {
  const user = await guard(req, res); if (!user) return;
  try {
    const { type, image, video, scale } = req.body || {};
    if (type === 'video') {
      if (!checkHttps(video)) return res.status(400).json({ error: 'Link video harus HTTPS valid' });
      if (!(await limit(res, user, 'video'))) return;
      const id = await replicate(process.env.VIDEO_MODEL || 'lucataco/real-esrgan-video', { video_path: video, resolution: 'FHD' });
      await saveGen({ user_id: user.id, kind: 'video', prediction_id: id });
      return res.json({ id });
    }
    if (!checkDataUrl(image)) return res.status(400).json({ error: 'Gambar harus PNG/JPG/WEBP maks 3MB' });
    if (!(await limit(res, user, 'image'))) return;
    const id = await replicate(process.env.IMAGE_MODEL || 'nightmareai/real-esrgan', { image, scale: [2, 4].includes(+scale) ? +scale : 2, face_enhance: true });
    await saveGen({ user_id: user.id, kind: 'image', prediction_id: id });
    res.json({ id });
  } catch { res.status(500).json({ error: 'Gagal memproses' }); }
}
