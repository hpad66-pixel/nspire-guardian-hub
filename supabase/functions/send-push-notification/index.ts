import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- VAPID helpers (pure Web Crypto, no external deps) ---

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function importVapidPrivateKey(rawPrivate: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'pkcs8',
    rawPrivate.buffer as ArrayBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

async function buildVapidAuthHeader(
  audience: string,
  vapidPublicKeyB64u: string,
  vapidPrivateKeyPkcs8B64u: string,
  subject: string,
): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + 12 * 3600;
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp: expiry, sub: subject };

  const encode = (obj: object) =>
    uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(obj)));

  const signingInput = `${encode(header)}.${encode(payload)}`;
  const privateKeyBytes = base64UrlToUint8Array(vapidPrivateKeyPkcs8B64u);
  const key = await importVapidPrivateKey(privateKeyBytes);
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  );

  const jwt = `${signingInput}.${uint8ArrayToBase64Url(new Uint8Array(sig))}`;
  return `vapid t=${jwt},k=${vapidPublicKeyB64u}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, url } = await req.json();

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: 'user_id and title required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (subsError) throw subsError;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({ title, body, url: url || '/dashboard', icon: '/icons/apas-os-192.png' });

    let sent = 0;
    const errors: string[] = [];

    for (const sub of subs) {
      try {
        const endpoint = sub.endpoint as string;
        const origin = new URL(endpoint).origin;

        const authHeader = await buildVapidAuthHeader(
          origin,
          vapidPublicKey,
          vapidPrivateKey,
          'mailto:admin@apasos.app',
        );

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            'TTL': '86400',
          },
          body: new TextEncoder().encode(payload),
        });

        if (response.status === 201 || response.status === 200) {
          sent++;
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired — remove it
          await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
        } else {
          errors.push(`${endpoint}: ${response.status}`);
        }
      } catch (e) {
        errors.push(String(e));
      }
    }

    return new Response(JSON.stringify({ sent, errors }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
