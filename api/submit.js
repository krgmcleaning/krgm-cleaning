// Vercel serverless function: saves contact/quote requests and newsletter signups to Supabase,
// and (optionally) emails a notification through Resend.
//
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   SUPABASE_URL           e.g. https://xxxx.supabase.co            (required)
//   SUPABASE_ANON_KEY      the project's publishable/anon key       (required; RLS allows insert only)
//   RESEND_API_KEY         from resend.com                           (optional — enables email)
//   NOTIFY_EMAIL           where notifications go                    (optional, comma-separated)
//   NOTIFY_FROM            e.g. "KR&GM Website <quotes@krandgmcleaning.com>" (optional; default onboarding@resend.dev)

const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function cleanEstimate(e) {
  if (!e || typeof e !== 'object') return null;
  const num = (v, max) => (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= max ? Number(v) : null);
  return {
    service: clip(e.service, 80),
    bedrooms: num(e.bedrooms, 50),
    bathrooms: num(e.bathrooms, 50),
    size: num(e.size, 1000000),
    extras: Array.isArray(e.extras) ? e.extras.slice(0, 20).map((x) => clip(x, 80)) : [],
    total: num(e.total, 1000000),
    currency: 'USD',
  };
}

async function insert(table, row) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      // Legacy JWT anon keys also need the Authorization header; new sb_publishable_ keys don't.
      ...(process.env.SUPABASE_ANON_KEY.startsWith('sb_') ? {} : { Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}` }),
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!r.ok && r.status !== 409) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
}

async function notify(subject, html, replyTo) {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFY_EMAIL) return;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM || 'KR&GM Website <onboarding@resend.dev>',
      to: process.env.NOTIFY_EMAIL.split(',').map((s) => s.trim()).filter(Boolean),
      reply_to: replyTo || undefined,
      subject,
      html,
    }),
  });
  if (!r.ok) console.error('Resend error', r.status, await r.text());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return res.status(500).json({ error: 'The form is not configured yet. Please call or message us on Facebook.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  // Honeypot: bots fill hidden fields. Pretend success.
  if (clip(body.website, 200)) return res.status(200).json({ ok: true });

  const email = clip(body.email, 200).toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

  try {
    if (body.kind === 'newsletter') {
      await insert('newsletter_subscribers', { email });
      await notify('New newsletter subscriber', `<p>New subscriber: <b>${esc(email)}</b></p>`);
      return res.status(200).json({ ok: true });
    }

    const row = {
      name: clip(body.name, 120) || null,
      email,
      phone: clip(body.phone, 40) || null,
      message: clip(body.message, 5000) || null,
      estimate: cleanEstimate(body.estimate),
      user_agent: clip(req.headers['user-agent'], 300) || null,
    };
    await insert('quote_requests', row);

    const est = row.estimate;
    const estHtml = est ? `<h3>Calculator estimate</h3><ul>
      <li>Cleaning: ${esc(est.service)}</li><li>Bedrooms: ${esc(est.bedrooms)}</li><li>Bathrooms: ${esc(est.bathrooms)}</li>
      <li>Home size: ${esc(est.size)} sq ft</li><li>Extras: ${esc(est.extras.join(', ') || 'None')}</li>
      <li><b>Estimate: $${esc(est.total)} USD</b></li></ul>` : '';
    await notify(
      `New ${est ? 'quote request' : 'message'} from ${row.name || email}`,
      `<h2>New website ${est ? 'quote request' : 'message'}</h2>
       <p><b>Name:</b> ${esc(row.name || '—')}<br><b>Email:</b> ${esc(email)}<br><b>Phone:</b> ${esc(row.phone || '—')}</p>
       <p style="white-space:pre-wrap">${esc(row.message || '')}</p>${estHtml}`,
      email,
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Sorry, we could not send your message right now. Please try again in a few minutes.' });
  }
}
