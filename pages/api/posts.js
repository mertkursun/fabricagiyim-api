import supabase from '../../lib/supabaseClient.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  console.log('>>> METHOD:', req.method, 'URL:', req.url);

  if (req.method === 'OPTIONS') {
    console.log('>>> OPTIONS preflight yanıtlandı');
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    console.log('>>> GET /posts çalışıyor');
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('>>> Supabase GET hatası:', error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log('>>> GET sonucu:', data.length, 'kayıt');
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    console.log('>>> POST /posts çalışıyor, body:', req.body);
    const { name, date, time, reservation, company, email, phone } = req.body;

    if (!name || !date || !time || !reservation) {
      console.warn('>>> Eksik alanlar');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('posts')
      .insert([{ name, date, time, reservation, company, email, phone }])
      .select()
      .single();

    if (error) {
      console.error('>>> Supabase POST hatası:', error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log('>>> POST başarılı, eklenen:', data);
    return res.status(201).json(data);
  }

  console.warn('>>> Method not allowed:', req.method);
  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
  return res.status(405).json({ error: 'Method Not Allowed' });
}
