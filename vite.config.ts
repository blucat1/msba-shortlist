import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: { environment: 'jsdom', include: ['tests/unit/**/*.test.{ts,tsx}'], setupFiles: ['tests/setup.ts'] },
  build: { rolldownOptions: { output: { codeSplitting: { groups: [
    { name: 'react', test: /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//, priority: 30 },
    { name: 'supabase', test: /node_modules\/@supabase\//, priority: 20 },
    { name: 'validation', test: /node_modules\/zod\//, priority: 20 },
    { name: 'interface', test: /node_modules\/(?:@radix-ui|lucide-react)\//, priority: 10 },
  ] } } } },
});
