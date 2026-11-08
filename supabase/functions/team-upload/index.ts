// team-upload: the Gabor AI Team (local program) uploads a social media post image here, because Facebook and
// Instagram need a PUBLIC image URL. Access: the same team token as the team_* database functions (only its
// sha256 is stored in public.team_access). JPEG/PNG only, max 8 MB, stored in the public "social" bucket.
const URL_ = Deno.env.get('SUPABASE_URL')!;
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  let body: { token?: string; dataBase64?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'invalid JSON' }); }
  const token = String(body.token || '');
  if (!/^krgm_team_[a-f0-9]{48}$/.test(token)) return json(401, { error: 'not authorized' });
  const hash = await sha256Hex(token);
  const check = await fetch(`${URL_}/rest/v1/team_access?select=id&revoked=eq.false&token_sha256=eq.${hash}`, { headers: { apikey: KEY, authorization: `Bearer ${KEY}` } });
  const rows = check.ok ? await check.json() : [];
  if (!Array.isArray(rows) || !rows.length) return json(401, { error: 'not authorized' });

  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(String(body.dataBase64 || '')), c => c.charCodeAt(0)); } catch { return json(400, { error: 'invalid image data' }); }
  if (bytes.length < 1000 || bytes.length > 8 * 1024 * 1024) return json(400, { error: 'image must be between 1 KB and 8 MB' });
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (!isJpeg && !isPng) return json(400, { error: 'only JPEG or PNG' });
  const ext = isJpeg ? 'jpg' : 'png';
  const month = new Date().toISOString().slice(0, 7);
  const name = `posts/${month}/${crypto.randomUUID()}.${ext}`;
  const up = await fetch(`${URL_}/storage/v1/object/social/${name}`, {
    method: 'POST',
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': isJpeg ? 'image/jpeg' : 'image/png', 'x-upsert': 'false' },
    body: bytes
  });
  if (!up.ok) return json(502, { error: `storage error ${up.status}` });
  return json(200, { url: `${URL_}/storage/v1/object/public/social/${name}`, path: name, bytes: bytes.length });
});
