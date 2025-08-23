import supabase from '../../lib/supabaseClient.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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
          let mimeType = 'image/jpeg'; // Default MIME type
          let base64Data = image;
          
          // Base64 formatını ve dosya tipini algıla
          const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          
          if (matches && matches.length === 3) {
            // Data URL formatında gelmiş
            mimeType = matches[1];
            base64Data = matches[2];
          } else {
            // Sadece base64 string olarak gelmiş - JPEG olarak varsay
            mimeType = 'image/jpeg';
            base64Data = image;
          }
          
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

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID parametresi gerekli' });
      }

      // ID'yi integer'a çevir
      const announcementId = parseInt(id, 10);
      
      if (isNaN(announcementId)) {
        return res.status(400).json({ error: 'Geçersiz ID formatı' });
      }

      // Önce announcement'ı bul ve image URL'ini al
      const { data: announcement, error: fetchError } = await supabase
        .from('announcements')
        .select('image')
        .eq('id', announcementId)
        .single();

      if (fetchError) {
        console.error('Announcement fetch error:', fetchError);
        return res.status(404).json({ error: 'Announcement bulunamadı' });
      }

      // Eğer image varsa, Supabase Storage'dan sil
      if (announcement.image) {
        try {
          // URL'den dosya adını çıkar
          const urlParts = announcement.image.split('/');
          const fileName = urlParts[urlParts.length - 1];

          const { error: deleteImageError } = await supabase.storage
            .from('image')
            .remove([fileName]);

          if (deleteImageError) {
            console.error('Image delete error:', deleteImageError);
            // Image silinmese bile devam et
          }
        } catch (imageError) {
          console.error('Image processing error:', imageError);
          // Image silinmese bile devam et
        }
      }

      // Veritabanından announcement'ı sil
      console.log('Deleting announcement with ID:', announcementId);
      const { data: deletedData, error: deleteError, count } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId)
        .select();

      console.log('Delete operation result:', {
        deletedData,
        deleteError,
        count,
        deletedCount: deletedData?.length || 0
      });

      if (deleteError) {
        console.error('DELETE announcements error:', deleteError);
        return res.status(500).json({ error: deleteError.message });
      }

      // Gerçekten silinip silinmediğini kontrol et
      if (!deletedData || deletedData.length === 0) {
        console.error('No rows were deleted');
        return res.status(404).json({ 
          success: false, 
          message: 'Announcement bulunamadı veya silinemedi' 
        });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Announcement başarıyla silindi',
        deletedItem: deletedData[0]
      });

    } catch (err) {
      console.error('DELETE announcements error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'OPTIONS']);
  return res.status(405).json({ error: 'Method Not Allowed' });
} 