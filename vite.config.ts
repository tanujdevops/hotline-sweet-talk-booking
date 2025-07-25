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
    // Minimal build configuration for debugging
    minify: false,
    sourcemap: true,
    target: 'es2020'
  }
  };
});
