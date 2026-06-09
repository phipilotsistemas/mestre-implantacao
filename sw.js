// Service Worker — Portal do Franqueado Mestre da Obra
// Estrategia: network-first para a pagina (sempre versao mais nova quando online),
// com cache de fallback para funcionar offline. Assets estaticos: cache-first.

const CACHE = 'mo-portal-v3';
const ESSENCIAIS = [
  'portal-franqueado.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
];

// Instalacao: pre-cacheia o essencial
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ESSENCIAIS)).catch(() => {})
  );
  self.skipWaiting();
});

// Ativacao: limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Fetch: necessario para o app ser instalavel
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // So lida com GET do mesmo conteudo navegavel; deixa Firebase/APIs passarem direto
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Nao intercepta chamadas a Firebase, Google, gstatic, etc.
  if (url.origin !== self.location.origin) return;

  // Paginas HTML: network-first (online manda versao nova; offline usa cache)
  const ehPagina = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (ehPagina) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('portal-franqueado.html')))
    );
    return;
  }

  // Assets estaticos (icones, manifest): cache-first
  event.respondWith(
    caches.match(req).then((cacheado) =>
      cacheado ||
      fetch(req).then((resp) => {
        const clone = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
        return resp;
      })
    )
  );
});
