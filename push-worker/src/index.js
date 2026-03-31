// ═══ DAWAM PUSH WORKER ═══
// Notifications intelligentes basées sur les horaires de prière (aladhan.com)
// Chiffrement payload RFC 8291 (aes128gcm) via Web Crypto API native

// ── Helpers ────────────────────────────────────────────────────────────────
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

function concat(...arrays) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

// ── VAPID ──────────────────────────────────────────────────────────────────
async function importVapidPrivateKey(privB64, pubB64) {
  const priv = fromB64url(privB64);
  const pub  = fromB64url(pubB64);
  const jwk  = {
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

// ── Chiffrement payload RFC 8291 (aes128gcm) ──────────────────────────────
async function encryptPayload(subscription, plaintext) {
  const { p256dh, auth } = subscription.keys;
  const enc = new TextEncoder();
  const clientPublic = fromB64url(p256dh);
  const authSecret   = fromB64url(auth);

  const clientKey = await crypto.subtle.importKey(
    'raw', clientPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const serverPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const serverPublic = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverPair.publicKey)
  );
  const ecdhBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientKey }, serverPair.privateKey, 256
  );

  // RFC 8291 §3.3 : IKM
  const ecdhKey = await crypto.subtle.importKey(
    'raw', ecdhBits, { name: 'HKDF' }, false, ['deriveBits']
  );
  const keyInfo = concat(enc.encode('WebPush: info\x00'), clientPublic, serverPublic);
  const ikmBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: keyInfo },
    ecdhKey, 256
  );

  // RFC 8188 : CEK + Nonce
  const salt   = crypto.getRandomValues(new Uint8Array(16));
  const ikmKey = await crypto.subtle.importKey(
    'raw', ikmBits, { name: 'HKDF' }, false, ['deriveBits']
  );
  const cekBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: concat(enc.encode('Content-Encoding: aes128gcm\x00'), new Uint8Array([1])) },
    ikmKey, 128
  );
  const nonceBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: concat(enc.encode('Content-Encoding: nonce\x00'), new Uint8Array([1])) },
    ikmKey, 96
  );

  const cekKey = await crypto.subtle.importKey(
    'raw', cekBits, { name: 'AES-GCM' }, false, ['encrypt']
  );
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonceBits, tagLength: 128 },
      cekKey,
      concat(enc.encode(plaintext), new Uint8Array([2]))
    )
  );

  // En-tête aes128gcm
  const header = new Uint8Array(21 + serverPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = serverPublic.length;
  header.set(serverPublic, 21);

  return concat(header, ciphertext);
}

// ── Envoi d'un push ────────────────────────────────────────────────────────
async function sendPush(subscription, privKey, vapidPublicKey, vapidSubject, type) {
  const jwt = await makeVapidJWT(subscription.endpoint, vapidSubject, privKey);

  if (type && subscription.keys?.p256dh && subscription.keys?.auth) {
    const body = await encryptPayload(subscription, type);
    return fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'TTL': '86400',
        'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Content-Length': String(body.byteLength),
      },
      body,
    });
  }

  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'TTL': '86400',
      'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
      'Content-Length': '0',
    },
  });
}

// ── Identifiant stable d'une subscription ─────────────────────────────────
async function subId(endpoint) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return b64url(buf).slice(0, 32);
}

// ── Horaires de prière ─────────────────────────────────────────────────────
// Fetch + cache par ville × jour (TTL 12h) dans le KV SUBSCRIPTIONS
async function getPrayerTimes(city, env) {
  if (!city) return null;
  const now = new Date();
  const dateStr = `${now.getUTCDate()}-${now.getUTCMonth() + 1}-${now.getUTCFullYear()}`;
  const cacheKey = `pt:${city.toLowerCase().trim()}:${dateStr}`;

  const cached = await env.SUBSCRIPTIONS.get(cacheKey);
  if (cached) return JSON.parse(cached);

  try {
    const url = `https://api.aladhan.com/v1/timingsByAddress/${dateStr}?address=${encodeURIComponent(city)}&method=2`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.code !== 200) return null;
    const result = { timings: data.data.timings, timezone: data.data.meta.timezone };
    await env.SUBSCRIPTIONS.put(cacheKey, JSON.stringify(result), { expirationTtl: 43200 });
    return result;
  } catch (_) {
    return null;
  }
}

// Convertit "HH:MM" en minutes depuis minuit
function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Retourne les minutes courantes dans un fuseau horaire donné
function localMinutes(timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find(p => p.type === 'hour').value) % 24;
  const m = parseInt(parts.find(p => p.type === 'minute').value);
  return h * 60 + m;
}

// Retourne le type de notif à envoyer maintenant, ou null
// Fenêtres : qiyam = [Fajr-35, Fajr-5[  |  aube = [Fajr, Fajr+20[  |  nuit = [Isha, Isha+20[
function typeForNow(timings, timezone) {
  const now   = localMinutes(timezone);
  const fajr  = toMin(timings.Fajr);
  const isha  = toMin(timings.Isha);

  if (now >= fajr - 35 && now < fajr - 5)  return 'qiyam';
  if (now >= fajr       && now < fajr + 20) return 'aube';
  if (now >= isha       && now < isha + 20) return 'nuit';
  return null;
}

// ── Anti-doublon quotidien via KV ──────────────────────────────────────────
function todayUTC() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

async function hasSent(env, id, type) {
  return (await env.SUBSCRIPTIONS.get(`sent:${id}:${type}:${todayUTC()}`)) !== null;
}

async function markSent(env, id, type) {
  await env.SUBSCRIPTIONS.put(`sent:${id}:${type}:${todayUTC()}`, '1', { expirationTtl: 86400 });
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

// ── Envoi groupé fixe (journee + test manuel) ─────────────────────────────
async function notifyAll(env, type) {
  const privKey = await importVapidPrivateKey(env.VAPID_PRIVATE_KEY, env.VAPID_PUBLIC_KEY);
  let cursor;
  do {
    const page = await env.SUBSCRIPTIONS.list({ cursor, limit: 100 });
    cursor = page.cursor;
    await Promise.allSettled(
      page.keys
        .filter(k => !k.name.startsWith('sent:') && !k.name.startsWith('pt:'))
        .map(async ({ name }) => {
          const raw = await env.SUBSCRIPTIONS.get(name);
          if (!raw) return;
          const sub = JSON.parse(raw);
          const res = await sendPush(sub, privKey, env.VAPID_PUBLIC_KEY, env.VAPID_SUBJECT, type);
          if (res.status === 410 || res.status === 404) await env.SUBSCRIPTIONS.delete(name);
          else await markSent(env, name, type);
        })
    );
  } while (cursor);
}

// ── Envoi adaptatif basé sur les horaires de prière ───────────────────────
async function notifyAdaptive(env) {
  const privKey = await importVapidPrivateKey(env.VAPID_PRIVATE_KEY, env.VAPID_PUBLIC_KEY);
  let cursor;
  do {
    const page = await env.SUBSCRIPTIONS.list({ cursor, limit: 100 });
    cursor = page.cursor;
    await Promise.allSettled(
      page.keys
        .filter(k => !k.name.startsWith('sent:') && !k.name.startsWith('pt:'))
        .map(async ({ name }) => {
          const raw = await env.SUBSCRIPTIONS.get(name);
          if (!raw) return;
          const sub = JSON.parse(raw);

          // Pas de ville → pas de notif adaptative
          if (!sub.city) return;

          const pt = await getPrayerTimes(sub.city, env);
          if (!pt) return;

          const type = typeForNow(pt.timings, pt.timezone);
          if (!type) return;

          // Ne pas envoyer deux fois le même type dans la journée
          if (await hasSent(env, name, type)) return;

          const res = await sendPush(sub, privKey, env.VAPID_PUBLIC_KEY, env.VAPID_SUBJECT, type);
          if (res.status === 410 || res.status === 404) await env.SUBSCRIPTIONS.delete(name);
          else await markSent(env, name, type);
        })
    );
  } while (cursor);
}

// ── Worker principal ───────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const { pathname } = new URL(request.url);

    // Clé publique VAPID
    if (pathname === '/public-key') {
      return json({ key: env.VAPID_PUBLIC_KEY });
    }

    // Enregistrer une subscription (avec city optionnelle)
    if (pathname === '/subscribe' && request.method === 'POST') {
      const body = await request.json();
      if (!body?.endpoint || !body?.keys) return json({ error: 'invalid' }, 400);
      const id = await subId(body.endpoint);
      // Stocker endpoint + keys + city
      const sub = { endpoint: body.endpoint, keys: body.keys, city: body.city || '' };
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

    // Test manuel : POST /send-test { token, type? }
    // type = "qiyam" | "aube" | "journee" | "nuit" | "adaptive"
    if (pathname === '/send-test' && request.method === 'POST') {
      const { token, type = 'aube' } = await request.json().catch(() => ({}));
      if (token !== env.TEST_TOKEN) return json({ error: 'unauthorized' }, 401);
      if (type === 'adaptive') {
        await notifyAdaptive(env);
        return json({ ok: true, type: 'adaptive', message: 'Envoi adaptatif lancé' });
      }
      const validTypes = ['qiyam', 'aube', 'journee', 'nuit'];
      const notifType = validTypes.includes(type) ? type : 'aube';
      await notifyAll(env, notifType);
      return json({ ok: true, type: notifType, message: 'Notifications envoyées' });
    }

    return new Response('Dawam Push Service 🌙', { headers: CORS });
  },

  // Crons :
  //   */10 * * * *  → vérification adaptative (qiyam / aube / nuit selon horaires de prière)
  //   0 10 * * *    → journée fixe (12h Paris)
  async scheduled(event, env, ctx) {
    if (event.cron === '0 10 * * *') {
      ctx.waitUntil(notifyAll(env, 'journee'));
    } else {
      ctx.waitUntil(notifyAdaptive(env));
    }
  },
};
