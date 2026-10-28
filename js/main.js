import { boot } from './state.js';
import { render, bindEvents, checkUpdate } from './ui.js';

boot();
bindEvents();
render();

// Offline support: only on the real site (not inside previews).
const host = location.hostname;
if ('serviceWorker' in navigator && (host.endsWith('github.io') || host === 'localhost' || host === '127.0.0.1')) {
  // a new version takes over as soon as it is installed (skipWaiting + clients.claim); reload once so it shows
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register('./sw.js').then(reg => {
    // check for a new version whenever the app comes back to the foreground
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { reg.update().catch(() => { }); checkUpdate(); } });
    checkUpdate();
  }).catch(() => { });
}
// Warm the 3D engine in the background so the first demo opens fast (and is cached for offline use).
const warm = () => import('./viewer3d.js').then(m => m.loadThree()).catch(() => { });
if ('requestIdleCallback' in window) requestIdleCallback(() => setTimeout(warm, 2500)); else setTimeout(warm, 4000);
