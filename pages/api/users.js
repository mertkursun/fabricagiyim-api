import supabase from '../../lib/supabaseClient.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const { name, password } = req.query;

      if (!name || !password) {
        return res.status(400).json({ error: 'Name ve password gerekli' });
      }

      // Users tablosundan name ve password ile eşleşen kaydı ara
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('name', name)
        .eq('password', password)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Kayıt bulunamadı
          return res.status(401).json({ 
            success: false, 
            message: 'Kullanıcı adı veya şifre hatalı' 
          });
        }
        return res.status(500).json({ error: error.message });
      }

      if (data) {
        // Giriş başarılı
        return res.status(200).json({ 
          success: true, 
          message: 'Giriş başarılı',
          user: {
            name: data.name,
            id: data.id
          }
        });
      } else {
        return res.status(401).json({ 
          success: false, 
          message: 'Kullanıcı adı veya şifre hatalı' 
        });
      }

    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password are required' });
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{ name, password }]);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data[0]);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ error: 'Method Not Allowed' });
}
