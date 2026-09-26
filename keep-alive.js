/**
 * Daily health check for the Supabase database.
 * Called by Vercel Cron; returns no private data and performs one lightweight RPC.
 */
module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.authorization || '';
  const isVercelCron = request.headers['user-agent'] === 'vercel-cron/1.0';

  if (cronSecret) {
    if (authorization !== `Bearer ${cronSecret}`) {
      return response.status(401).json({ ok: false, error: 'Unauthorized' });
    }
  } else if (!isVercelCron) {
    return response.status(401).json({ ok: false, error: 'Cron only' });
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return response.status(500).json({ ok: false, error: 'Missing Supabase environment variables' });
  }

  const startedAt = Date.now();
  try {
    const upstream = await fetch(`${supabaseUrl}/rest/v1/rpc/keep_alive`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: '{}',
      signal: AbortSignal.timeout(12000)
    });

    const body = await upstream.text();
    if (!upstream.ok) {
      console.error('Supabase keep-alive failed', upstream.status, body.slice(0, 300));
      return response.status(502).json({ ok: false, error: 'Supabase health check failed', status: upstream.status });
    }

    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({ ok: true, latencyMs: Date.now() - startedAt, database: JSON.parse(body) });
  } catch (error) {
    console.error('Supabase keep-alive error', error);
    return response.status(502).json({ ok: false, error: 'Supabase unavailable' });
  }
}
