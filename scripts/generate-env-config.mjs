import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const outPath = path.join(root, "env-config.js");
const mediapipePublicPath = path.join(root, "mediapipe", "public", "env-config.js");

function parseEnv(content) {
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

let env = {};
if (fs.existsSync(envPath)) {
  env = parseEnv(fs.readFileSync(envPath, "utf8"));
}

const config = {
  SUPABASE_URL:
    process.env.VITE_SUPABASE_URL ||
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    "",
  SUPABASE_ANON_KEY:
    process.env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    "",
  MEDIAPIPE_APP_URL:
    process.env.MEDIAPIPE_APP_URL || env.MEDIAPIPE_APP_URL || "",
};

const contents = `window.__ENV__ = ${JSON.stringify(config, null, 2)};\n`;

const mediapipeBuildPath = path.join(root, "mediapipe-samples-web", "env-config.js");

fs.writeFileSync(outPath, contents);
fs.mkdirSync(path.dirname(mediapipePublicPath), { recursive: true });
fs.writeFileSync(mediapipePublicPath, contents);

if (fs.existsSync(path.dirname(mediapipeBuildPath))) {
  fs.writeFileSync(mediapipeBuildPath, contents);
}

console.log("Generated env-config.js");
