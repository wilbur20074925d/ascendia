/** GitHub Pages project-site base path, e.g. "/ascendia". Empty string for local root hosting. */
export function getSiteBasePath() {
  const raw = process.env.SITE_BASE_PATH ?? "";
  if (!raw || raw === "/") return "";
  return raw.replace(/\/$/, "");
}

export function getSitePrefix() {
  const base = getSiteBasePath();
  return base ? `${base}/` : "";
}

export function getDefaultMediapipeAppUrl() {
  if (process.env.MEDIAPIPE_APP_URL) return process.env.MEDIAPIPE_APP_URL;

  const owner = process.env.GITHUB_REPOSITORY_OWNER;
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
  const base = getSiteBasePath();

  if (owner && repo) {
    return `https://${owner}.github.io${base}/mediapipe-samples-web/`;
  }

  return base ? `${base}/mediapipe-samples-web/` : "/mediapipe-samples-web/";
}
