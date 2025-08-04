import supabase from '../../lib/supabaseClient.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('users').select('*');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
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
