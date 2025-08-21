import supabase from '../../lib/supabaseClient.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('users').select('*');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    try {
      const { name, password } = req.body;

      if (!name || !password) {
        return res.status(400).json({ error: 'Name ve password gerekli' });
      }

      // Debug için önce tüm kullanıcıları kontrol edelim
      console.log('Gelen veriler:', { name, password });
      
      // Önce tüm kullanıcıları alalım ve manuel kontrol yapalım
      const { data: allUsers, error: fetchError } = await supabase
        .from('users')
        .select('*');
      
      if (fetchError) {
        console.error('Kullanıcıları getirme hatası:', fetchError);
        return res.status(500).json({ error: fetchError.message });
      }
      
      console.log('Tüm kullanıcılar:', allUsers);
      
      // Manuel olarak eşleşme kontrolü yapalım
      const matchedUser = allUsers.find(user => 
        user.name && user.name.toLowerCase() === name.toLowerCase() &&
        user.password && user.password === password
      );
      
      console.log('Eşleşen kullanıcı:', matchedUser);
      
      if (matchedUser) {
        // Giriş başarılı
        return res.status(200).json({ 
          success: true, 
          message: 'Giriş başarılı',
          user: {
            name: matchedUser.name,
            id: matchedUser.id
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

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ error: 'Method Not Allowed' });
}
