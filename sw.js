var CACHE_NAME = 'range-v2';
var URLS_TO_CACHE = [
  './',
  './index.html',
  './rangeicon.jpg',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.9/babel.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

// Allow the page to tell a freshly-installed SW to take over immediately
self.addEventListener('message', function(e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', function(e) {
  // Network first for Firebase/API calls
  if (e.request.url.indexOf('firebasejs') >= 0 ||
      e.request.url.indexOf('googleapis.com') >= 0 ||
      e.request.url.indexOf('firestore') >= 0 ||
      e.request.url.indexOf('identitytoolkit') >= 0) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Network first for the app shell (HTML) — always try the server first so a
  // newly deployed index.html is picked up; fall back to cache only when offline.
  if (e.request.mode === 'navigate' ||
      e.request.url.indexOf('index.html') >= 0 ||
      e.request.url.endsWith('/Range/') ||
      e.request.url.endsWith('/Range') ||
      e.request.url.endsWith('/')) {
    e.respondWith(
      fetch(e.request).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        return response;
      }).catch(function() {
        return caches.match(e.request).then(function(r) {
          return r || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Cache first for other static assets (fonts, libs, icons)
  e.respondWith(
    caches.match(e.request).then(function(resp) {
      return resp || fetch(e.request).then(function(response) {
        if (response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      });
    })
  );
});
