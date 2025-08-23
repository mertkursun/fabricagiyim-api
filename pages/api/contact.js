import supabase from '../../lib/supabaseClient.js';
import { Resend } from 'resend';

const RESEND_API_KEY = 're_3B8F2JTX_4KGJbvJSDiBMrJ1hULbaD4cp';



export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const { name, company, email, phone, title, desc } = req.body;

      if (!name || !email || !title || !desc) {
        return res.status(400).json({ error: 'name, email, title ve desc alanları zorunludur' });
      }

      // Veritabanına kaydet
      const { data: inserted, error } = await supabase
        .from('contacts')
        .insert([{ name, company, email, phone, title, desc }])
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        return res.status(500).json({ error: error.message });
      }

      // Email içeriği hazırla
      const emailSubject = `İletişim Formu: ${title}`;
      const emailContent = 
        `Yeni İletişim Formu Mesajı:\n\n` +
        `Ad: ${name}\n` +
        (company ? `Firma: ${company}\n` : '') +
        `E-posta: ${email}\n` +
        (phone ? `Telefon: ${phone}\n` : '') +
        `Konu: ${title}\n\n` +
        `Mesaj:\n${desc}`;

      const htmlContent = `
        <h2>Yeni İletişim Formu Mesajı</h2>
        <p><strong>Ad:</strong> ${name}</p>
        ${company ? `<p><strong>Firma:</strong> ${company}</p>` : ''}
        <p><strong>E-posta:</strong> ${email}</p>
        ${phone ? `<p><strong>Telefon:</strong> ${phone}</p>` : ''}
        <p><strong>Konu:</strong> ${title}</p>
        <br>
        <p><strong>Mesaj:</strong></p>
        <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">${desc.replace(/\n/g, '<br>')}</p>
      `;

      // Mail gönder
      const resend = new Resend(RESEND_API_KEY);
      const { error: mailError } = await resend.emails.send({
        from: 'no-reply@fabrica.com.tr',
        to: [email],
        subject: emailSubject,
        text: emailContent,
        html: htmlContent
      });

      if (mailError) {
        console.error('Mail send error:', mailError);
        return res.status(500).json({ 
          error: 'Mesaj kaydedildi ancak e-posta gönderilemedi',
          data: inserted 
        });
      }

      return res.status(201).json({
        success: true,
        message: 'İletişim formu başarıyla gönderildi',
        data: inserted
      });

    } catch (err) {
      console.error('POST error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['POST', 'OPTIONS']);
  return res.status(405).json({ error: 'Method Not Allowed' });
}
