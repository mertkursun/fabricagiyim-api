import supabase from '../../lib/supabaseClient.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('GET announcements error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data);
    } catch (err) {
      console.error('GET announcements error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { title_tr, title_en, desc_tr, desc_en, image } = req.body;

      // Zorunlu alanları kontrol et
      if (!title_tr || !title_en || !desc_tr || !desc_en) {
        return res.status(400).json({ 
          error: 'title_tr, title_en, desc_tr ve desc_en alanları zorunludur' 
        });
      }

      let imageUrl = null;

      // Eğer image verisi varsa, Supabase Storage'a yükle
      if (image) {
        try {
          // Base64 formatını ve dosya tipini algıla
          const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          
          if (!matches || matches.length !== 3) {
            return res.status(400).json({ error: 'Geçersiz resim formatı' });
          }
          
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Dosya uzantısını belirle
          let fileExtension = 'jpg';
          if (mimeType === 'image/png') {
            fileExtension = 'png';
          } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
            fileExtension = 'jpg';
          } else if (mimeType === 'image/webp') {
            fileExtension = 'webp';
          } else if (mimeType === 'image/gif') {
            fileExtension = 'gif';
          }
          
          // Dosya adı oluştur (timestamp + random)
          const fileName = `announcement_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
          
          // Supabase Storage'a yükle
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('image')
            .upload(fileName, buffer, {
              contentType: mimeType,
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Image upload error:', uploadError);
            return res.status(500).json({ error: 'Resim yükleme hatası' });
          }

          // Public URL oluştur
          const { data: urlData } = supabase.storage
            .from('image')
            .getPublicUrl(fileName);

          imageUrl = urlData.publicUrl;
          console.log('Image uploaded successfully:', imageUrl);

        } catch (imageError) {
          console.error('Image processing error:', imageError);
          return res.status(500).json({ error: 'Resim işleme hatası' });
        }
      }

      // Veritabanına kaydet
      const { data: inserted, error } = await supabase
        .from('announcements')
        .insert([{ 
          title_tr, 
          title_en, 
          desc_tr, 
          desc_en, 
          image: imageUrl 
        }])
        .select()
        .single();

      if (error) {
        console.error('POST announcements error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json(inserted);
    } catch (err) {
      console.error('POST announcements error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
  return res.status(405).json({ error: 'Method Not Allowed' });
} 