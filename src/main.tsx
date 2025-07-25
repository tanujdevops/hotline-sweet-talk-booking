
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import App from './App';

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
} else {
  console.error("Root element not found");
}
