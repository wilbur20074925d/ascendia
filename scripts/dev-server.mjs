import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import httpProxy from "http-proxy";
import handler from "serve-handler";
import { handleKimiRequest } from "./kimi-proxy.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MEDIAPIPE_TARGET = "http://localhost:5174";
const PORT = 5173;

const proxy = httpProxy.createProxyServer({ ws: true, changeOrigin: true });

const server = http.createServer((req, res) => {
  const url = req.url ?? "/";

  if (url === "/api/kimi" || url.startsWith("/api/kimi?") || url.startsWith("/api/kimi/")) {
    handleKimiRequest(req, res).catch((err) => {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: err instanceof Error ? err.message : "Internal server error",
          }),
        );
      }
    });
    return;
  }

  if (url.startsWith("/mediapipe-samples-web")) {
    proxy.web(req, res, { target: MEDIAPIPE_TARGET }, (err) => {
      console.error("[proxy]", err.message);
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end("MediaPipe dev server is starting. Refresh in a moment.");
    });
    return;
  }

  handler(req, res, {
    public: root,
    rewrites: [{ source: "**", destination: "/index.html" }],
  });
});

server.on("upgrade", (req, socket, head) => {
  if (req.url?.startsWith("/mediapipe-samples-web")) {
    proxy.ws(req, socket, head, { target: MEDIAPIPE_TARGET });
  }
});

server.listen(PORT, () => {
  console.log(`Accepting connections at http://localhost:${PORT}`);
  console.log(
    `MediaPipe proxied at http://localhost:${PORT}/mediapipe-samples-web/`
  );
});
