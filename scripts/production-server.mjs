import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import handler from "serve-handler";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 3000);

const MEDIAPIPE_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

function normalizeRequest(req) {
  const original = req.url ?? "/";
  const [pathname, search = ""] = original.split("?");
  const suffix = search ? `?${search}` : "";

  if (pathname === "/mediapipe-samples-web" || pathname === "/mediapipe-samples-web/") {
    req.url = `/mediapipe-samples-web/index.html${suffix}`;
    return "mediapipe";
  }

  if (pathname.startsWith("/mediapipe-samples-web/")) {
    return "mediapipe";
  }

  if (pathname === "/login" || pathname === "/login/") {
    req.url = `/login/index.html${suffix}`;
  }

  return "site";
}

const server = http.createServer((req, res) => {
  const section = normalizeRequest(req);

  if (section === "mediapipe") {
    for (const [key, value] of Object.entries(MEDIAPIPE_HEADERS)) {
      res.setHeader(key, value);
    }
  }

  handler(req, res, {
    public: root,
    cleanUrls: false,
    rewrites: [{ source: "**", destination: "/index.html" }],
  });
});

server.listen(PORT, () => {
  console.log(`Production server listening on http://0.0.0.0:${PORT}`);
});
