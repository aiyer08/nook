import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const tint = document.createElement('div');
tint.id = 'tint-layer';
document.body.appendChild(tint);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
