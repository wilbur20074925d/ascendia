import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getMediapipeBasePath } from "./site-base.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(label, command, args, env = {}) {
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("Generate env config", "node", ["scripts/generate-env-config.mjs"]);

const viteBase = getMediapipeBasePath();
run("Build MediaPipe app", "npm", ["run", "build", "--prefix", "mediapipe"], {
  VITE_BASE: viteBase,
});

run("Refresh env config for build output", "node", ["scripts/generate-env-config.mjs"]);
run("Prepare static deploy assets", "node", ["scripts/prepare-pages-deploy.mjs"]);

console.log("\nSite build complete.");
