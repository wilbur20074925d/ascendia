import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getSitePrefix } from "./site-base.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const prefix = getSitePrefix();

function patchRootHtml(html) {
  if (!prefix) return html;

  return html
    .replaceAll('src="./env-config.js"', `src="${prefix}env-config.js"`)
    .replaceAll('src="./auth/login.js"', `src="${prefix}auth/login.js"`)
    .replaceAll('src="./assets/', `src="${prefix}assets/`)
    .replaceAll('href="./assets/', `href="${prefix}assets/`);
}

function patchMarketingRouterBasename() {
  if (!prefix) return;

  const assetsDir = path.join(root, "assets");
  if (!fs.existsSync(assetsDir)) return;

  const needle = 'jsx(_q,{"code-path":"src/main.tsx:7:3",children:';
  const replacement =
    'jsx(_q,{"code-path":"src/main.tsx:7:3",basename:(window.__ENV__&&window.__ENV__.SITE_BASE_PATH)||"",children:';

  for (const file of fs.readdirSync(assetsDir)) {
    if (!file.startsWith("index-") || !file.endsWith(".js")) continue;

    const filePath = path.join(assetsDir, file);
    let js = fs.readFileSync(filePath, "utf8");
    if (!js.includes(needle) || js.includes("basename:(window.__ENV__")) continue;

    js = js.replace(needle, replacement);
    fs.writeFileSync(filePath, js);
    console.log(`Patched router basename in assets/${file}`);
  }
}

function copyEnvConfigToMediapipeBuild() {
  const envConfig = path.join(root, "env-config.js");
  const mediapipeEnv = path.join(root, "mediapipe-samples-web", "env-config.js");
  if (fs.existsSync(envConfig) && fs.existsSync(path.dirname(mediapipeEnv))) {
    fs.copyFileSync(envConfig, mediapipeEnv);
    console.log("Copied env-config.js to mediapipe-samples-web/");
  }
}

const indexPath = path.join(root, "index.html");
const html = fs.readFileSync(indexPath, "utf8");
const patched = patchRootHtml(html);

fs.writeFileSync(indexPath, patched);
fs.writeFileSync(path.join(root, "404.html"), patched);

const loginDir = path.join(root, "login");
fs.mkdirSync(loginDir, { recursive: true });
fs.writeFileSync(path.join(loginDir, "index.html"), patched);

patchMarketingRouterBasename();
copyEnvConfigToMediapipeBuild();

console.log(
  prefix
    ? `Prepared GitHub Pages deploy with base prefix "${prefix}"`
    : "Prepared GitHub Pages deploy (no SITE_BASE_PATH; paths unchanged)",
);
