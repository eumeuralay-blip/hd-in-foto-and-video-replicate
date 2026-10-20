// Nilai publik (anon key memang aman dipublikasikan, dilindungi RLS)
export default (req, res) => { res.setHeader('Cache-Control', 'public, max-age=300'); res.json({ url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY }); };
