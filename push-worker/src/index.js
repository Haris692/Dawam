// ═══ DAWAM PUSH WORKER ═══
// VAPID + Web Push via Web Crypto API native (pas de dépendances npm)

// ── Helpers base64url ──────────────────────────────────────────────────────
function b64url(buf) {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromB64url(str) {
  const p = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = p + '='.repeat((4 - p.length % 4) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

// ── VAPID ──────────────────────────────────────────────────────────────────
// Importe la clé privée VAPID (format raw base64url → JWK)
async function importVapidPrivateKey(privB64, pubB64) {
  const priv = fromB64url(privB64);
  const pub = fromB64url(pubB64);
  // La clé publique VAPID est au format non-compressé : 04 || x(32) || y(32)
  const jwk = {
    kty: 'EC', crv: 'P-256',
    x: b64url(pub.slice(1, 33)),
    y: b64url(pub.slice(33, 65)),
    d: b64url(priv),
  };
  return crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );
}

// Génère le JWT VAPID pour l'authentification
async function makeVapidJWT(endpoint, subject, privKey) {
  const { protocol, host } = new URL(endpoint);
  const audience = `${protocol}//${host}`;
  const now = Math.floor(Date.now() / 1000);
  const enc = new TextEncoder();

  const header  = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64url(enc.encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: subject })));
  const input   = `${header}.${payload}`;

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privKey,
    enc.encode(input)
  );
  return `${input}.${b64url(sig)}`;
}

// Envoie un push sans payload chiffré (le SW choisit le message à afficher)
async function sendPush(subscription, privKey, vapidPublicKey, vapidSubject) {
  const jwt = await makeVapidJWT(subscription.endpoint, vapidSubject, privKey);
  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'TTL': '86400',
      'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
      'Content-Length': '0',
    },
  });
}

// Crée un identifiant stable à partir de l'endpoint
async function subId(endpoint) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return b64url(buf).slice(0, 32);
}

// ── Réponses HTTP ──────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// ── Worker principal ───────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    // Preflight CORS
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const { pathname } = new URL(request.url);

    // Clé publique VAPID — la PWA en a besoin pour créer la subscription
    if (pathname === '/public-key') {
      return json({ key: env.VAPID_PUBLIC_KEY });
    }

    // Enregistrer une nouvelle subscription push
    if (pathname === '/subscribe' && request.method === 'POST') {
      const sub = await request.json();
      if (!sub?.endpoint || !sub?.keys) return json({ error: 'invalid' }, 400);
      const id = await subId(sub.endpoint);
      await env.SUBSCRIPTIONS.put(id, JSON.stringify(sub));
      return json({ ok: true });
    }

    // Supprimer une subscription
    if (pathname === '/unsubscribe' && request.method === 'POST') {
      const { endpoint } = await request.json();
      if (!endpoint) return json({ error: 'missing endpoint' }, 400);
      const id = await subId(endpoint);
      await env.SUBSCRIPTIONS.delete(id);
      return json({ ok: true });
    }

    return new Response('Dawam Push Service 🌙', { headers: CORS });
  },

  // Cron quotidien — défini dans wrangler.toml [triggers]
  async scheduled(event, env, ctx) {
    ctx.waitUntil(notifyAll(env));
  },
};

// ── Envoi groupé ───────────────────────────────────────────────────────────
async function notifyAll(env) {
  const privKey = await importVapidPrivateKey(env.VAPID_PRIVATE_KEY, env.VAPID_PUBLIC_KEY);

  let cursor;
  do {
    const page = await env.SUBSCRIPTIONS.list({ cursor, limit: 100 });
    cursor = page.cursor;

    await Promise.allSettled(
      page.keys.map(async ({ name }) => {
        const raw = await env.SUBSCRIPTIONS.get(name);
        if (!raw) return;
        const sub = JSON.parse(raw);
        const res = await sendPush(sub, privKey, env.VAPID_PUBLIC_KEY, env.VAPID_SUBJECT);
        // 410 Gone / 404 = subscription expirée → on la supprime
        if (res.status === 410 || res.status === 404) {
          await env.SUBSCRIPTIONS.delete(name);
        }
      })
    );
  } while (cursor);
}
