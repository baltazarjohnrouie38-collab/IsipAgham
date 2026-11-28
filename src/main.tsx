import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (registration && typeof registration.update === 'function') {
        void registration.update();
      }
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
