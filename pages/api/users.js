import supabase from '../../lib/supabaseClient.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const rawName = (req.body?.name ?? '').trim();
      const rawPass = (req.body?.password ?? '').trim();
      if (!rawName || !rawPass) {
        return res.status(400).json({ error: 'Name ve password gerekli' });
      }

      // RLS varsa supabaseAdmin kullan; yoksa supabase da olur
      const { data: user, error } = await supabase
        .from('users')
        .select('id,name,password')
        .eq('name', rawName)           // doğrudan DB’de filtrele
        .limit(1)
        .single();

      if (error) {
        console.error('DB error:', error);
        return res.status(500).json({ error: 'DB error' });
      }

      // basit karşılaştırma (HASH KULLANMANI ÖNERİRİM)
      if (!user || user.password !== rawPass) {
        return res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı' });
      }

      return res.status(200).json({ success: true, message: 'Giriş başarılı', user: { id: user.id, name: user.name } });
    } catch (e) {
      console.error('Login error:', e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}