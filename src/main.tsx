import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

console.log(
  "%c🚀 Karuna-Maitri Group Platform Initialized\n%cDeveloped & Engineered by Harsh Gosaliya",
  "color: #0B2F64; font-size: 16px; font-weight: bold; font-family: sans-serif;",
  "color: #C5A059; font-size: 12px; font-weight: bold; font-family: sans-serif;"
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Smoothly dismiss mobile app splash screen once React completes initial render
setTimeout(() => {
  const splash = document.getElementById("pwa-splash");
  if (splash) {
    splash.style.opacity = "0";
    splash.style.visibility = "hidden";
    setTimeout(() => splash.remove(), 400);
  }
}, 300);
