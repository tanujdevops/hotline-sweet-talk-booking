
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';

// Performance monitoring
const reportWebVitals = (metric: any) => {
  // Log Core Web Vitals to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(metric);
  }
  
  // In production, you would send these metrics to an analytics service
  // Example: if (metric.name === 'LCP') sendToAnalytics(metric);
};

// Measure performance
const observePerformance = () => {
  if ('PerformanceObserver' in window) {
    // Core Web Vitals
    try {
      const webVitalsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          reportWebVitals(entry);
        }
      });
      
      webVitalsObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      webVitalsObserver.observe({ type: 'first-input', buffered: true });
      webVitalsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.error('Performance monitoring error:', e);
    }
  }
};

// Initialize performance monitoring
observePerformance();

// Mount the application
createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
