import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Identifiant de build, embarqué dans le JS et publié dans /version.json : une app
// restée ouverte en arrière-plan compare les deux au retour et se recharge si besoin.
const buildId = new Date().toISOString();

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'jobingo-version',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: buildId }) });
      },
    },
  ],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
});
