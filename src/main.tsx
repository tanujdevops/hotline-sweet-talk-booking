
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';

// Import App directly for faster LCP
import App from './App.tsx';

// Error boundary for better error handling
class ErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if ((this.state as any).hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
            <p className="text-xl text-gray-600 mb-4">Please refresh the page</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return (this.props as any).children;
  }
}

// Performance monitoring
const reportWebVitals = (metric: any) => {
  // Log Core Web Vitals to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(metric);
  }
};

// Measure performance
const observePerformance = () => {
  if ('PerformanceObserver' in window) {
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

// Register service worker for caching
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW: Service Worker registered successfully', registration);
      })
      .catch((error) => {
        console.log('SW: Service Worker registration failed', error);
      });
  });
}

// Mount the application with error boundary and suspense
const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </ErrorBoundary>
  );
} else {
  console.error("Root element not found");
}
