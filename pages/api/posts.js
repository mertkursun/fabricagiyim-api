import supabase from '../../lib/supabaseClient.js';
import { Resend } from 'resend';

const RESEND_API_KEY = 're_3B8F2JTX_4KGJbvJSDiBMrJ1hULbaD4cp';

// UTC format
function toUTCFromDate(dateObj) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    dateObj.getUTCFullYear().toString() +
    pad(dateObj.getUTCMonth() + 1) +
    pad(dateObj.getUTCDate()) +
    'T' +
    pad(dateObj.getUTCHours()) +
    pad(dateObj.getUTCMinutes()) +
    pad(dateObj.getUTCSeconds()) +
    'Z'
  );
}

function buildICS({ title, description, location, startUTC, endUTC, organizerEmail, attendeeEmails, uid }) {
  const attendees = attendeeEmails
    .map((email) => `ATTENDEE;ROLE=REQ-PARTICIPANT:mailto:${email}`)
    .join('\r\n');

  return [
    'BEGIN:VCALENDAR',
    'PRODID:-//Fabricagiyim//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${startUTC}`,
    `DTSTART:${startUTC}`,
    `DTEND:${endUTC}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description || ''}`,
    location ? `LOCATION:${location}` : '',
    organizerEmail ? `ORGANIZER:mailto:${organizerEmail}` : '',
    attendees,
    'END:VEVENT',
    'END:VCALENDAR'
  ]
    .filter(Boolean)
    .join('\r\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    try {
      const { name, date, time, reservation, company, email, phone } = req.body;

      if (!name || !date || !time || !reservation) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const { data: inserted, error } = await supabase
        .from('posts')
        .insert([{ name, date, time, reservation, company, email, phone }])
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      const title = `Randevu: ${reservation} - ${name}`;
      const description =
        `Rezervasyon Bilgileri:\n` +
        `Ad: ${name}\n` +
        (company ? `Firma: ${company}\n` : '') +
        (email ? `E-posta: ${email}\n` : '') +
        (phone ? `Telefon: ${phone}\n` : '') +
        `Tarih: ${date} ${time}\n`;

      const startDateObj = new Date(`${date}T${time}:00`);
      const endDateObj = new Date(startDateObj.getTime() + 60 * 60 * 1000);
      const startUTC = toUTCFromDate(startDateObj);
      const endUTC = toUTCFromDate(endDateObj);
      const uid = `post-${Date.now()}@fabricagiyim`;

      const toList = ['mustafamertkursun@hotmail.com.tr'];
      if (email) toList.push(email);

      const ics = buildICS({
        title,
        description,
        location: 'Ofis',
        startUTC,
        endUTC,
        organizerEmail: 'no-reply@fabricagiyim.com',
        attendeeEmails: toList,
        uid
      });

      const resend = new Resend(RESEND_API_KEY);
      const { error: mailError } = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: toList,
        subject: title,
        text: description,
        html: `<pre>${description}</pre>`,
        attachments: [
          {
            filename: 'invite.ics',
            content: ics,
            contentType: 'text/calendar; method=REQUEST; charset=utf-8'
          }
        ]
      });

      if (mailError) {
        console.error('Mail send error:', mailError);
        return res.status(500).json({ error: 'Database saved but mail send failed' });
      }

      return res.status(201).json(inserted);

    } catch (err) {
      console.error('POST error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
  return res.status(405).json({ error: 'Method Not Allowed' });
}
