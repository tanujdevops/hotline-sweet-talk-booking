import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import compression from 'vite-plugin-compression';
import { devCompression } from './vite-dev-compression.js';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
  define: {
    // Tree shake development only code
    __DEV__: !isProduction,
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    }
  },
  esbuild: {
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    treeShaking: true
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    mode === 'development' && devCompression(),
    isProduction && compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      verbose: false,
    }),
    isProduction && compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      verbose: false,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: isProduction ? 'terser' : false,
    sourcemap: !isProduction,
    target: ['es2020', 'chrome80', 'safari13'],
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-toast'],
          router: ['react-router-dom'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true
  }
  };
});
