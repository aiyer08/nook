import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const tint = document.createElement('div');
tint.id = 'tint-layer';
document.body.appendChild(tint);

/*
  Offline, but only in production.

  A planner you can't open on the underground isn't much of a planner, so the
  service worker keeps the app shell. It's deliberately not registered in dev:
  a cached bundle sitting in front of Vite's hot reload is a genuinely
  confusing afternoon.
*/
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      /* no offline support here, which is a shame rather than a problem */
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
