import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';
import fs from 'fs';
import {
  buildSessionIndex,
  getSessionSources,
  resolveSessionFilePath,
} from './server/sessionSources.js';

const sessionsIndex = () => ({
  name: 'sessions-index',
  configureServer(server) {
    server.middlewares.use('/__sessions_index', (req, res) => {
      const sources = getSessionSources(process.env, process.cwd());
      const files = buildSessionIndex(sources);

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(files));
    });

    server.middlewares.use('/__session_file', (req, res) => {
      const requestUrl = new URL(req.url || '/', 'http://localhost');
      const [encodedSourceId, archiveLabel, encodedRel] = requestUrl.pathname
        .replace(/^\/+/, '')
        .split('/');

      const sourceId = decodeURIComponent(encodedSourceId || '');
      const rel = decodeURIComponent(encodedRel || '');
      const sources = getSessionSources(process.env, process.cwd());
      const filePath = resolveSessionFilePath(sources, sourceId, archiveLabel, rel);

      if (!filePath) {
        res.statusCode = 404;
        res.end('Session file not found');
        return;
      }

      res.setHeader('Content-Type', 'application/jsonl; charset=utf-8');
      fs.createReadStream(filePath).pipe(res);
    });
  },
});

export default defineConfig({
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),
    vuetify(),
    sessionsIndex(),
  ],
  server: {
    host: process.env.VITE_HOST || '0.0.0.0',
    port: Number(process.env.VITE_PORT) || 5172,
    strictPort: true,
    watch: {
      ignored: ['**/sessions/**'],
    },
  },
  envPrefix: ['VITE_', 'SESSIONS_', 'CODEX_SESSION_'],
});
