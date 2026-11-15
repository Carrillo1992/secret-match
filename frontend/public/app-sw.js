// The service worker the SPA registers (#117): Angular's ngsw-worker.js, behind one filter.
//
// Requests to another origin (the API, Google sign-in) and /config.json never reach Angular's
// worker: this listener runs first and stops the event without answering it, so the browser fetches
// them as if there were no service worker. API responses are private to one User, so a shared
// device must never get them from a cache; config.json differs per deploy and is rewritten after
// `ng build`, so it must always come from the network. ngsw-config.json lists neither of them, and
// has no dataGroups, so this is a second lock, not the only one.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname === '/config.json') {
    event.stopImmediatePropagation();
  }
});

importScripts('./ngsw-worker.js');
