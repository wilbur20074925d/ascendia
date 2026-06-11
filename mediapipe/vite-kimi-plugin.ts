import type { Plugin } from 'vite';
import { handleKimiRequest } from '../scripts/kimi-proxy.mjs';

/** Dev-only API route for Kimi movement analysis (avoids proxy/HTML fallback issues). */
export function kimiApiPlugin(): Plugin {
  return {
    name: 'ascendia-kimi-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== '/api/kimi' && path !== '/api/kimi/') {
          next();
          return;
        }
        handleKimiRequest(req, res).catch((err) => {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: err instanceof Error ? err.message : 'Internal server error',
              }),
            );
          }
        });
      });
    },
  };
}
