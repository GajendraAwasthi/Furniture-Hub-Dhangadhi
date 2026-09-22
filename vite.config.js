import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: ['**/.*/**', '**/*.png', '**/*.py', '**/supabase/**']
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-insights': ['@vercel/speed-insights']
        }
      }
    }
  }
});

