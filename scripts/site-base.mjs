/** GitHub Pages project-site base path, e.g. "/ascendia". Empty for custom domains. */
export function getSiteBasePath() {
  const raw = process.env.SITE_BASE_PATH ?? "";
  if (!raw || raw === "/") return "";
  return raw.replace(/\/$/, "");
}

export function getSitePrefix() {
  const base = getSiteBasePath();
  return base ? `${base}/` : "";
}

export function getMediapipeBasePath() {
  const explicit = process.env.VITE_BASE;
  if (explicit) return explicit.replace(/\/?$/, "/");

  const site = getSiteBasePath();
  return site ? `${site}/mediapipe-samples-web/` : "/mediapipe-samples-web/";
}

export function getDefaultMediapipeAppUrl() {
  if (process.env.MEDIAPIPE_APP_URL) return process.env.MEDIAPIPE_APP_URL;

  const publicSite = (process.env.PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const mediapipeBase = getMediapipeBasePath();

  if (publicSite) {
    return `${publicSite}${mediapipeBase}`;
  }

  const owner = process.env.GITHUB_REPOSITORY_OWNER;
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
  const site = getSiteBasePath();

  if (owner && repo) {
    return `https://${owner}.github.io${site}/mediapipe-samples-web/`;
  }

  return mediapipeBase;
}
