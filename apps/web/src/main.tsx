/**
 * Point d’entrée front Marneza (Vite + React 19).
 * Monte <App /> avec React Router. Styles : globals.css + thème marneza-theme.ts.
 * Build prod → dist/ uploadé FileZilla sur booking.marneza.com
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from '@/App';
import '@/globals.css';

const rawBase = import.meta.env.BASE_URL || '/';
const basename = rawBase === '/' ? undefined : rawBase.replace(/\/$/, '');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
