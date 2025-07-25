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
    // Optimize for faster parsing and reduced main thread work
    cssCodeSplit: true,
    rollupOptions: {
      // Enable more aggressive tree shaking
      treeshake: {
        preset: 'recommended',
        manualPureFunctions: ['console.log', 'console.info', 'console.warn', 'console.debug'],
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
      output: {
        // Optimize chunk sizes for faster parsing
        experimentalMinChunkSize: 500, // Smaller chunks for faster parsing
        manualChunks: (id) => {
          // Split React dev/prod bundles
          if (id.includes('react-dom/cjs/react-dom.development.js')) {
            return 'react-dev';
          }
          if (id.includes('scheduler/cjs/scheduler.development.js')) {
            return 'react-dev';
          }
          
          // Critical vendor libraries
          if (id.includes('react') && !id.includes('router') && !id.includes('query')) {
            return 'react-core';
          }
          if (id.includes('react-dom') && !id.includes('development')) {
            return 'react-core';
          }
          
          // Router - separate chunk since not all pages use all features
          if (id.includes('react-router') || id.includes('@remix-run/router')) {
            return 'router';
          }
          
          // Supabase - heavy library, separate chunk
          if (id.includes('@supabase') || id.includes('supabase')) {
            return 'supabase';
          }
          
          // React Query - data management
          if (id.includes('@tanstack/react-query') || id.includes('query-core')) {
            return 'query';
          }
          
          // Icons - tree-shakeable, separate chunk
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          
          // Form libraries
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
            return 'forms';
          }
          
          // Radix UI components - group by usage frequency
          if (id.includes('@radix-ui/react-accordion') || id.includes('@radix-ui/react-collapsible')) {
            return 'ui-interactive';
          }
          if (id.includes('@radix-ui/react-dialog') || id.includes('@radix-ui/react-popover') || id.includes('@radix-ui/react-tooltip')) {
            return 'ui-overlay';
          }
          if (id.includes('@radix-ui/react-select') || id.includes('@radix-ui/react-radio-group') || id.includes('@radix-ui/react-checkbox')) {
            return 'ui-forms';
          }
          if (id.includes('@radix-ui/react-toast') || id.includes('sonner')) {
            return 'ui-feedback';
          }
          if (id.includes('@radix-ui')) {
            return 'ui-core';
          }
          
          // Utility libraries
          if (id.includes('tailwind-merge') || id.includes('clsx') || id.includes('class-variance-authority')) {
            return 'ui-utils';
          }
          if (id.includes('date-fns')) {
            return 'date-utils';
          }
          if (id.includes('react-helmet-async')) {
            return 'seo-utils';
          }
          
          // Node modules that are large
          if (id.includes('node_modules')) {
            if (id.includes('prop-types') || id.includes('react-is')) {
              return 'react-utils';
            }
            return 'vendor';
          }
        },
        // Optimize chunk naming for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        },
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.warn'],
          passes: 3,
          unsafe: true,
          unsafe_comps: true,
          unsafe_math: true,
          unsafe_methods: true,
          unsafe_proto: true,
          unsafe_regexp: true,
          unsafe_undefined: true,
          dead_code: true,
          keep_fargs: false,
          pure_getters: true,
          reduce_vars: true,
          side_effects: false,
          unused: true
        },
        mangle: {
          safari10: true,
          toplevel: true,
          properties: {
            regex: /^_/
          }
        },
        format: {
          comments: false
        }
      },
    sourcemap: false,
    reportCompressedSize: false
  }
  };
});
