// Rendu image par image de index.html → MP4 (H.264, 1080×1920).
//   node render.mjs                         → dawam-presentation.mp4 (60 i/s)
//   node render.mjs --fps 30 --out a.mp4    → autre cadence / fichier
//   node render.mjs --stills 1.5,9,20       → images PNG de contrôle dans ./stills
// Prérequis : Node 18+, ffmpeg, Playwright (Chromium).
import { createServer } from 'node:http';
import { readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));
const FPS = Number(args.fps || 60);
const OUT = path.resolve(ROOT, args.out || 'dawam-presentation.mp4');
const WORKERS = Number(args.workers || 4);

async function loadPlaywright() {
  try { return await import('playwright'); } catch {
    const req = createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js'));
    return req('playwright');
  }
}

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
function serve() {
  return new Promise(resolve => {
    const srv = createServer(async (req, res) => {
      const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(ROOT)) { res.writeHead(403).end(); return; }
      try {
        const body = await readFile(p.endsWith(path.sep) ? path.join(p, 'index.html') : p);
        res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }).end(body);
      } catch { res.writeHead(404).end(); }
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

async function openPage(browser, url) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('[page]', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  return page;
}

function ffmpeg(argv) {
  const p = spawn('ffmpeg', argv, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', d => { err += d; });
  const done = new Promise((res, rej) => p.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg: ' + err.slice(-2000)))));
  return { p, done };
}

async function renderSegment(chromium, url, from, to, file, label) {
  const browser = await chromium.launch({ args: LAUNCH_ARGS });
  const page = await openPage(browser, url);
  const { p, done } = ffmpeg(['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-tune', 'film', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS), file]);
  const t0 = Date.now();
  for (let f = from; f < to; f++) {
    await page.evaluate(t => window.renderAt(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!p.stdin.write(buf)) await new Promise(r => p.stdin.once('drain', r));
    if ((f - from) % 120 === 0) console.log(`${label} ${f - from}/${to - from} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  p.stdin.end();
  await done;
  await browser.close();
}

const srv = await serve();
const url = `http://127.0.0.1:${srv.address().port}/index.html?render`;
const { chromium } = await loadPlaywright();
const LAUNCH_ARGS = ['--force-color-profile=srgb', '--disable-lcd-text'];
const browser = await chromium.launch({ args: LAUNCH_ARGS });
try {
  if (args.stills) {
    const dir = path.join(ROOT, 'stills');
    await mkdir(dir, { recursive: true });
    const page = await openPage(browser, url);
    for (const s of String(args.stills).split(',')) {
      await page.evaluate(t => window.renderAt(t), Number(s));
      await page.screenshot({ path: path.join(dir, `t${Number(s).toFixed(2).padStart(5, '0')}.png`) });
    }
    console.log('stills →', dir);
  } else {
    const duration = await (async () => { const p = await openPage(browser, url); const d = await p.evaluate(() => DURATION); await p.close(); return d; })();
    const total = Math.round(duration * FPS);
    const tmp = path.join(ROOT, '.render-tmp');
    await rm(tmp, { recursive: true, force: true });
    await mkdir(tmp, { recursive: true });
    const per = Math.ceil(total / WORKERS);
    const parts = [];
    for (let w = 0; w < WORKERS; w++) {
      const from = w * per, to = Math.min(total, from + per);
      if (from < to) parts.push({ from, to, file: path.join(tmp, `part${w}.mp4`) });
    }
    console.log(`${total} images à ${FPS} i/s, ${parts.length} segments`);
    await Promise.all(parts.map((s, i) => renderSegment(chromium, url, s.from, s.to, s.file, `[${i}]`)));
    await writeFile(path.join(tmp, 'list.txt'), parts.map(s => `file '${s.file}'`).join('\n'));
    // assemblage + piste audio silencieuse (compatibilité réseaux sociaux)
    const { done } = ffmpeg(['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'),
      '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '96k',
      '-movflags', '+faststart', OUT]);
    await done;
    await rm(tmp, { recursive: true, force: true });
    console.log('vidéo →', OUT);
  }
} finally {
  await browser.close();
  srv.close();
}
