// Supabase Auth Send SMS hook. Configure secrets on the server; never commit them.
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

Deno.serve(async (req: Request) => {
  const failure = (status: number) => new Response(JSON.stringify({ error: { http_code: status, message: 'SMS delivery unavailable' } }), { status, headers: { 'Content-Type': 'application/json' } });
  if (req.method !== 'POST') return failure(405);
  const hookSecret = Deno.env.get('SEND_SMS_HOOK_SECRET')?.replace(/^v1,whsec_/, '');
  const token = Deno.env.get('SHAHMIZ_API_TOKEN');
  if (!hookSecret || !token) return failure(503);
  let event: any;
  try {
    const body = await req.text();
    event = new Webhook(hookSecret).verify(body, Object.fromEntries(req.headers));
  } catch { return failure(401); }
  const phone = String(event?.user?.phone || '').replace(/^\+?98/, '0');
  const code = String(event?.sms?.otp || '');
  if (!/^09\d{9}$/.test(phone) || !/^\d{6}$/.test(code)) return failure(400);
  try {
    const response = await fetch('https://shahmiz.ir/project//otp//api/send-otp.php', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ mobile: phone, code }), signal: AbortSignal.timeout(4000)
    });
    // Accept only an explicit provider success response.
    const result = await response.json();
    if (!response.ok || result?.success !== true) return failure(502);
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch { return failure(502); }
});
