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

// ── HKDF manuel via HMAC-SHA-256 (RFC 5869) ──────────────────────────────
async function hmacSha256(key, data) {
  const k = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}

// HKDF-Extract(salt, ikm) → PRK
async function hkdfExtract(salt, ikm) {
  return hmacSha256(salt, ikm);
}

// HKDF-Expand(PRK, info, length) → OKM
async function hkdfExpand(prk, info, length) {
  const N = Math.ceil(length / 32);
  let T = new Uint8Array(0);
  const okm = new Uint8Array(length);
  let off = 0;
  for (let i = 1; i <= N; i++) {
    T = await hmacSha256(prk, concat(T, info, new Uint8Array([i])));
    const n = Math.min(32, length - off);
    okm.set(T.slice(0, n), off);
    off += n;
  }
  return okm;
}

// ── Chiffrement payload RFC 8291 (aes128gcm) ──────────────────────────────
async function encryptPayload(subscription, plaintext) {
  const { p256dh, auth } = subscription.keys;
  const enc = new TextEncoder();

  const uaPublic   = fromB64url(p256dh); // 65 bytes (uncompressed P-256)
  const authSecret = fromB64url(auth);   // 16 bytes

  // Ephémère serveur ECDH
  const serverPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const asPublic = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverPair.publicKey)
  ); // 65 bytes

  // Secret ECDH partagé
  const uaKey = await crypto.subtle.importKey(
    'raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, serverPair.privateKey, 256)
  ); // 32 bytes

  // RFC 8291 §3.3 : IKM
  // PRK_key = HKDF-Extract(auth_secret, ecdh_secret)
  const prkKey  = await hkdfExtract(authSecret, ecdhSecret);
  // key_info = "WebPush: info\0" || ua_public || as_public
  const keyInfo = concat(enc.encode('WebPush: info\x00'), uaPublic, asPublic);
  // IKM = HKDF-Expand(PRK_key, key_info, 32)
  const ikm     = await hkdfExpand(prkKey, keyInfo, 32);

  // RFC 8188 : CEK + Nonce
  const salt = crypto.getRandomValues(new Uint8Array(16));
  // PRK = HKDF-Extract(salt, IKM)
  const prk  = await hkdfExtract(salt, ikm);
  // CEK = HKDF-Expand(PRK, cek_info, 16)
  const cek  = await hkdfExpand(prk, concat(enc.encode('Content-Encoding: aes128gcm\x00'), new Uint8Array([1])), 16);
  // Nonce = HKDF-Expand(PRK, nonce_info, 12)
  const nonce = await hkdfExpand(prk, concat(enc.encode('Content-Encoding: nonce\x00'), new Uint8Array([1])), 12);

  // Chiffrement AES-GCM
  const cekKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce, tagLength: 128 },
      cekKey,
      concat(enc.encode(plaintext), new Uint8Array([2])) // 0x02 = last record delimiter
    )
  );

  // En-tête aes128gcm : salt(16) + rs(4) + idlen(1) + as_public(65)
  const header = new Uint8Array(21 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = asPublic.length;
  header.set(asPublic, 21);

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
// Fenêtres : aube = [Fajr, Fajr+20[  |  journee = [Dhuhr, Dhuhr+20[  |  soir = [Isha, Isha+20[
function typeForNow(timings, timezone) {
  const now   = localMinutes(timezone);
  const fajr  = toMin(timings.Fajr);
  const dhuhr = toMin(timings.Dhuhr);
  const isha  = toMin(timings.Isha);

  if (now >= fajr  && now < fajr  + 20) return 'aube';
  if (now >= dhuhr && now < dhuhr + 20) return 'journee';
  if (now >= isha  && now < isha  + 20) return 'soir';
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

          // iOS (Apple) ne déclenche pas le push event si payload chiffré → ping vide
          const isApple = sub.endpoint?.includes('apple.com');
          const res = await sendPush(sub, privKey, env.VAPID_PUBLIC_KEY, env.VAPID_SUBJECT, isApple ? null : type);
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
    // type = "aube" | "matin" | "aprem" | "nuit" | "adaptive"
    if (pathname === '/send-test' && request.method === 'POST') {
      const { token, type = 'aube' } = await request.json().catch(() => ({}));
      if (token !== env.TEST_TOKEN) return json({ error: 'unauthorized' }, 401);
      if (type === 'adaptive') {
        await notifyAdaptive(env);
        return json({ ok: true, type: 'adaptive', message: 'Envoi adaptatif lancé' });
      }
      const validTypes = ['aube', 'journee', 'soir'];
      const notifType = validTypes.includes(type) ? type : 'aube';
      await notifyAll(env, notifType);
      return json({ ok: true, type: notifType, message: 'Notifications envoyées' });
    }

    // Debug : POST /debug-push { token } — envoie à toutes les subs et retourne les statuts réels
    if (pathname === '/debug-push' && request.method === 'POST') {
      const { token } = await request.json().catch(() => ({}));
      if (token !== env.TEST_TOKEN) return json({ error: 'unauthorized' }, 401);

      const page = await env.SUBSCRIPTIONS.list({ limit: 100 });
      const subKeys = page.keys.filter(k =>
        !k.name.startsWith('sent:') && !k.name.startsWith('pt:') &&
        !k.name.startsWith('feedback:') && !k.name.startsWith('stats:')
      );

      const privKey = await importVapidPrivateKey(env.VAPID_PRIVATE_KEY, env.VAPID_PUBLIC_KEY);

      const results = await Promise.all(subKeys.map(async ({ name }) => {
        const raw = await env.SUBSCRIPTIONS.get(name);
        if (!raw) return { id: name, error: 'empty' };
        const sub = JSON.parse(raw);
        const service = sub.endpoint?.includes('apple.com') ? 'Apple' : 'FCM/Android';

        let pushStatus, pushBody, encryptError = null;
        try {
          const payload = JSON.stringify({ type: 'aube', title: 'Dawam 🌄', body: "La séance de l'aube t'attend — Coran, adhkar, constance." });
          const body = await encryptPayload(sub, payload);
          const jwt = await makeVapidJWT(sub.endpoint, env.VAPID_SUBJECT, privKey);
          const res = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'TTL': '86400',
              'Authorization': `vapid t=${jwt},k=${env.VAPID_PUBLIC_KEY}`,
              'Content-Type': 'application/octet-stream',
              'Content-Encoding': 'aes128gcm',
              'Content-Length': String(body.byteLength),
            },
            body,
          });
          pushStatus = res.status;
          pushBody = await res.text();
        } catch (e) {
          encryptError = e.message;
        }

        return { id: name, service, city: sub.city, pushStatus, pushBody: pushBody?.slice(0, 200), encryptError };
      }));

      return json({ count: results.length, results });
    }

    // Quel type de notif pour cet endpoint en ce moment ?
    // GET /notification-type?endpoint=URL_ENCODEE
    if (pathname === '/notification-type' && request.method === 'GET') {
      const endpoint = new URL(request.url).searchParams.get('endpoint');
      if (!endpoint) return json({ type: 'default' });
      const id = await subId(endpoint);
      const raw = await env.SUBSCRIPTIONS.get(id);
      if (!raw) return json({ type: 'default' });
      const sub = JSON.parse(raw);
      if (!sub.city) return json({ type: 'default' });
      const pt = await getPrayerTimes(sub.city, env);
      if (!pt) return json({ type: 'default' });
      const type = typeForNow(pt.timings, pt.timezone) || 'default';
      return json({ type, city: sub.city });
    }

    // Telemetrie SW : POST /push-log { type, rawText, hasData, ts }
    if (pathname === '/push-log' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      await env.SUBSCRIPTIONS.put(`pushlog:${id}`, JSON.stringify(body), { expirationTtl: 3600 });
      return json({ ok: true });
    }

    // Lire les logs SW : GET /push-log?token=xxx
    if (pathname === '/push-log' && request.method === 'GET') {
      const token = new URL(request.url).searchParams.get('token');
      if (token !== env.TEST_TOKEN) return json({ error: 'unauthorized' }, 401);
      const list = await env.SUBSCRIPTIONS.list({ prefix: 'pushlog:' });
      const items = await Promise.all(list.keys.map(async ({ name }) => {
        const raw = await env.SUBSCRIPTIONS.get(name);
        return raw ? JSON.parse(raw) : null;
      }));
      return json({ count: items.length, logs: items.filter(Boolean).sort((a, b) => b.ts - a.ts) });
    }

    // Debug clés : GET /debug-keys?token=xxx — vérifie les longueurs des clés en KV
    if (pathname === '/debug-keys' && request.method === 'GET') {
      const token = new URL(request.url).searchParams.get('token');
      if (token !== env.TEST_TOKEN) return json({ error: 'unauthorized' }, 401);

      const page = await env.SUBSCRIPTIONS.list({ limit: 100 });
      const subKeys = page.keys.filter(k =>
        !k.name.startsWith('sent:') && !k.name.startsWith('pt:') &&
        !k.name.startsWith('feedback:') && !k.name.startsWith('stats:')
      );
      const results = await Promise.all(subKeys.map(async ({ name }) => {
        const raw = await env.SUBSCRIPTIONS.get(name);
        if (!raw) return { id: name, error: 'empty' };
        const sub = JSON.parse(raw);
        const p256dh = sub.keys?.p256dh ? fromB64url(sub.keys.p256dh) : null;
        const auth   = sub.keys?.auth   ? fromB64url(sub.keys.auth)   : null;
        return {
          id: name,
          service: sub.endpoint?.includes('apple.com') ? 'Apple' : 'Other',
          city: sub.city,
          p256dhLength: p256dh?.length ?? 'missing',
          p256dhFirstByte: p256dh ? '0x' + p256dh[0].toString(16) : 'missing',
          authLength: auth?.length ?? 'missing',
        };
      }));
      return json({ results });
    }

    // Ping sans payload : POST /ping-push { token } — test de livraison sans chiffrement
    if (pathname === '/ping-push' && request.method === 'POST') {
      const { token } = await request.json().catch(() => ({}));
      if (token !== env.TEST_TOKEN) return json({ error: 'unauthorized' }, 401);

      const page = await env.SUBSCRIPTIONS.list({ limit: 100 });
      const subKeys = page.keys.filter(k =>
        !k.name.startsWith('sent:') && !k.name.startsWith('pt:') &&
        !k.name.startsWith('feedback:') && !k.name.startsWith('stats:')
      );

      const privKey = await importVapidPrivateKey(env.VAPID_PRIVATE_KEY, env.VAPID_PUBLIC_KEY);

      const results = await Promise.all(subKeys.map(async ({ name }) => {
        const raw = await env.SUBSCRIPTIONS.get(name);
        if (!raw) return { id: name, error: 'empty' };
        const sub = JSON.parse(raw);
        const service = sub.endpoint?.includes('apple.com') ? 'Apple' : 'FCM/Android';

        let pushStatus, pushBody;
        try {
          const jwt = await makeVapidJWT(sub.endpoint, env.VAPID_SUBJECT, privKey);
          const res = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'TTL': '86400',
              'Authorization': `vapid t=${jwt},k=${env.VAPID_PUBLIC_KEY}`,
              'Content-Length': '0',
            },
          });
          pushStatus = res.status;
          pushBody = await res.text();
        } catch (e) {
          pushBody = e.message;
        }

        return { id: name, service, city: sub.city, pushStatus, pushBody: pushBody?.slice(0, 200) };
      }));

      return json({ count: results.length, results });
    }

    // Liste toutes les souscriptions actives
    if (pathname === '/list-subs' && request.method === 'GET') {
      const token = new URL(request.url).searchParams.get('token');
      if (token !== env.TEST_TOKEN) return json({ error: 'unauthorized' }, 401);

      const page = await env.SUBSCRIPTIONS.list({ limit: 100 });
      const subKeys = page.keys.filter(k =>
        !k.name.startsWith('sent:') && !k.name.startsWith('pt:') &&
        !k.name.startsWith('feedback:') && !k.name.startsWith('stats:')
      );
      const subs = await Promise.all(subKeys.map(async ({ name }) => {
        const raw = await env.SUBSCRIPTIONS.get(name);
        if (!raw) return null;
        const sub = JSON.parse(raw);
        return {
          id: name,
          endpoint: sub.endpoint ? sub.endpoint.slice(0, 50) + '…' : 'missing',
          service: sub.endpoint?.includes('apple.com') ? 'Apple' : sub.endpoint?.includes('googleapis') || sub.endpoint?.includes('fcm') ? 'FCM/Android' : 'Other',
          city: sub.city || '(none)',
          hasKeys: !!(sub.keys?.p256dh && sub.keys?.auth),
        };
      }));
      return json({ count: subs.filter(Boolean).length, subs: subs.filter(Boolean) });
    }

    // Soumettre un avis utilisateur
    if (pathname === '/feedback' && request.method === 'POST') {
      const { rating, comment, palier, name } = await request.json().catch(() => ({}));
      if (!rating) return json({ error: 'missing rating' }, 400);
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const stars = ['', '😕', '😊', '🌟'][rating] || '?';
      const data = {
        rating,
        comment: (comment || '').slice(0, 400),
        palier: palier || null,
        name: (name || '').slice(0, 30),
        at: new Date().toISOString(),
      };
      await env.SUBSCRIPTIONS.put(`feedback:${id}`, JSON.stringify(data), { expirationTtl: 60 * 60 * 24 * 90 });

      // Envoi email via Resend
      if (env.RESEND_API_KEY) {
        const ratingLabels = { 1: 'À améliorer', 2: 'Bien', 3: 'Excellent' };
        const emailBody = [
          `Nouvel avis Dawam ${stars}`,
          ``,
          `Note     : ${stars} ${ratingLabels[rating] || rating}/3`,
          `Utilisateur : ${data.name || 'Anonyme'}`,
          `Palier   : ${data.palier || 'non renseigné'}`,
          `Date     : ${data.at}`,
          ``,
          `Commentaire :`,
          data.comment || '(aucun commentaire)',
        ].join('\n');

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Dawam App <onboarding@resend.dev>',
            to: ['mydawam.app@gmail.com'],
            subject: `${stars} Nouvel avis Dawam — ${ratingLabels[rating] || 'Note ' + rating}`,
            text: emailBody,
          }),
        }).catch(() => {}); // ne pas bloquer si Resend est KO
      }

      return json({ ok: true });
    }

    // Lire tous les avis (protégé par TEST_TOKEN)
    if (pathname === '/feedback/list' && request.method === 'GET') {
      const token = new URL(request.url).searchParams.get('token');
      if (token !== env.TEST_TOKEN) return json({ error: 'unauthorized' }, 401);
      const list = await env.SUBSCRIPTIONS.list({ prefix: 'feedback:' });
      const items = await Promise.all(
        list.keys.map(async ({ name }) => {
          const raw = await env.SUBSCRIPTIONS.get(name);
          return raw ? JSON.parse(raw) : null;
        })
      );
      const sorted = items.filter(Boolean).sort((a, b) => b.at.localeCompare(a.at));
      return json({ count: sorted.length, items: sorted });
    }

    // ── Analytics : track event ──────────────────────────────────────────────
    // POST /track  { event: "launch" | "onboarding_complete", uid? }
    if (pathname === '/track' && request.method === 'POST') {
      const { event, uid } = await request.json().catch(() => ({}));
      const allowed = ['launch', 'onboarding_complete'];
      if (!allowed.includes(event)) return json({ error: 'unknown event' }, 400);

      const today = todayUTC();

      // Compteur global de l'event
      const totalKey = `stats:total:${event}`;
      const prev = parseInt(await env.SUBSCRIPTIONS.get(totalKey) || '0');
      await env.SUBSCRIPTIONS.put(totalKey, String(prev + 1));

      // Compteur du jour
      const dayKey = `stats:day:${today}:${event}`;
      const prevDay = parseInt(await env.SUBSCRIPTIONS.get(dayKey) || '0');
      await env.SUBSCRIPTIONS.put(dayKey, String(prevDay + 1), { expirationTtl: 60 * 60 * 24 * 90 });

      // Utilisateurs uniques : on stocke l'uid (hash côté client) pour éviter les doublons du jour
      if (uid) {
        const uniqKey = `stats:uniq:${today}:${event}:${uid.slice(0, 32)}`;
        await env.SUBSCRIPTIONS.put(uniqKey, '1', { expirationTtl: 60 * 60 * 24 * 7 });
      }

      return json({ ok: true });
    }

    // ── Analytics : stats (protégé) ──────────────────────────────────────────
    // GET /stats?token=xxx
    if (pathname === '/stats' && request.method === 'GET') {
      const token = new URL(request.url).searchParams.get('token');
      if (token !== env.TEST_TOKEN) return json({ error: 'unauthorized' }, 401);

      const today = todayUTC();
      const [
        totalLaunch, totalOnboard,
        todayLaunch, todayOnboard,
      ] = await Promise.all([
        env.SUBSCRIPTIONS.get('stats:total:launch'),
        env.SUBSCRIPTIONS.get('stats:total:onboarding_complete'),
        env.SUBSCRIPTIONS.get(`stats:day:${today}:launch`),
        env.SUBSCRIPTIONS.get(`stats:day:${today}:onboarding_complete`),
      ]);

      // Utilisateurs uniques du jour (compter les clés uniq:today:*)
      const uniqList = await env.SUBSCRIPTIONS.list({ prefix: `stats:uniq:${today}:` });
      const uniqLaunch    = uniqList.keys.filter(k => k.name.includes(':launch:')).length;
      const uniqOnboard   = uniqList.keys.filter(k => k.name.includes(':onboarding_complete:')).length;

      // Derniers 7 jours
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setUTCDate(d.getUTCDate() - i);
        const ds = `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`;
        const [l, o] = await Promise.all([
          env.SUBSCRIPTIONS.get(`stats:day:${ds}:launch`),
          env.SUBSCRIPTIONS.get(`stats:day:${ds}:onboarding_complete`),
        ]);
        days.push({ date: ds, launch: parseInt(l||'0'), onboarding: parseInt(o||'0') });
      }

      return json({
        total: {
          launches:   parseInt(totalLaunch  || '0'),
          onboardings: parseInt(totalOnboard || '0'),
        },
        today: {
          launches:    parseInt(todayLaunch  || '0'),
          onboardings: parseInt(todayOnboard || '0'),
          unique_launches:    uniqLaunch,
          unique_onboardings: uniqOnboard,
        },
        last7days: days,
      });
    }

    return new Response('Dawam Push Service 🌙', { headers: CORS });
  },

  // Crons :
  //   */10 * * * *  → vérification adaptative (qiyam / aube / nuit selon horaires de prière)
  //   0 10 * * *    → journée fixe (12h Paris)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(notifyAdaptive(env));
  },
};
