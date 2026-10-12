// Service worker di "Le mie spese": tiene una copia dei file dell'app per usarla senza internet.
// I dati (spese, entrate, patrimonio) non passano mai da qui: restano nell'archivio del telefono.
const CACHE = 'spese-v5';
// immagini delle emoji (Fluent Emoji 3D): salvate subito, così le icone ci sono anche offline
const EMOJI = '1f6d2,1f35e,1f969,1f355,2615,1f37a,1f37d,1f3e0,1f6cb,1f4a1,1f525,1f4a7,1f4f1,1f310,1f697,26fd,1f686,1f68c,2708,1f3d6,1f3ae,1f3ac,1f3b5,1f4da,1f3a8,26bd,1f4aa,1f48a,1fa7a,1f487,1f455,1f45f,1f381,1f408,1f415,1f476,1f393,1f4bc,1f9fe,1f3e6,1f4b3,1f4b6,1f501,1f4fa,1f6e0,1f331,1f6cd,1f4b0,1f4c8,1f437,1fa99,1f9d3,21a9,1f3f7,1f3c6,1f4e6,1f504,1f4c5,270f'.split(',').map(c => 'emoji/' + c + '.png');
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'lib/chart.umd.js', 'lib/xlsx.full.min.js', ...EMOJI];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Prima la rete, chiedendo sempre al server se c'è una versione nuova ("no-cache": GitHub Pages
// fa tenere le pagine in cache fino a 10 minuti); senza rete, la copia salvata.
// Con campo debole non si aspetta all'infinito: dopo 4 secondi si usa la copia salvata
// (la versione nuova, se arriva, viene salvata per la prossima apertura).
const WAIT = 4000;
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const net = req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache' }) : fetch(req, { cache: 'no-cache' });
  const saved = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'));
  e.respondWith(new Promise(resolve => {
    let done = false;
    const give = r => { if (!done && r) { done = true; resolve(r); } };
    const timer = setTimeout(() => saved().then(give), WAIT);
    net
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        clearTimeout(timer); give(res);
      })
      .catch(() => { clearTimeout(timer); saved().then(r => { give(r || Response.error()); }); });
  }));
});
