import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Modo "demo": gera um único HTML autocontido (rotas com #, imagens embutidas)
// para mostrar o protótipo sem servidor. O modo normal gera o site para o Firebase Hosting.
export default defineConfig(({ mode }) => {
  const demo = mode === 'demo';
  return {
    plugins: demo ? [react(), viteSingleFile()] : [react()],
    define: {
      __DEMO_BUILD__: JSON.stringify(demo),
    },
    build: {
      outDir: demo ? 'dist-demo' : 'dist',
      assetsInlineLimit: demo ? 100_000_000 : 4096,
    },
  };
});
