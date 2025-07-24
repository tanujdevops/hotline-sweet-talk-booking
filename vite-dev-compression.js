import compression from 'compression';
import { createGzip, createBrotliCompress } from 'zlib';

export function devCompression() {
  const compressionMiddleware = compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      // Don't compress if caching is disabled
      if (req.headers['cache-control'] === 'no-cache') {
        return false;
      }
      
      // Compress text-based content types
      const contentType = res.getHeader('content-type');
      if (!contentType) return false;
      
      return /text|javascript|json|css|html|xml|svg/.test(contentType);
    }
  });

  return {
    name: 'dev-compression',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Skip compression for HMR and WebSocket connections
        if (req.url?.includes('__vite') || req.url?.includes('vite/client')) {
          return next();
        }
        
        // Apply compression middleware
        compressionMiddleware(req, res, next);
      });
    }
  };
}