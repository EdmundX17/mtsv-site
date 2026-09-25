import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent mouse wheel from incrementing/decrementing number inputs globally
document.addEventListener('wheel', () => {
  if (document.activeElement && (document.activeElement as HTMLInputElement).type === 'number') {
    (document.activeElement as HTMLElement).blur();
  }
}, { passive: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
