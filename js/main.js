import { boot } from './state.js';
import { render, bindEvents } from './ui.js';

boot();
bindEvents();
render();

// Offline support: only on the real site (not inside previews).
const host = location.hostname;
if ('serviceWorker' in navigator && (host.endsWith('github.io') || host === 'localhost' || host === '127.0.0.1')) {
  navigator.serviceWorker.register('./sw.js').catch(() => { });
}
// Warm the 3D engine in the background so the first demo opens fast (and is cached for offline use).
const warm = () => import('./viewer3d.js').then(m => m.loadThree()).catch(() => { });
if ('requestIdleCallback' in window) requestIdleCallback(() => setTimeout(warm, 2500)); else setTimeout(warm, 4000);
