import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

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

function getKimiApiKey() {
  if (process.env.KIMI_API_KEY) return process.env.KIMI_API_KEY;
  if (fs.existsSync(envPath)) {
    const env = parseEnv(fs.readFileSync(envPath, "utf8"));
    return env.KIMI_API_KEY || "";
  }
  return "";
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

export async function handleKimiRequest(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const apiKey = getKimiApiKey();
  if (!apiKey) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "KIMI_API_KEY is not configured. Add it to your .env file.",
      }),
    );
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON body" }));
    return;
  }

  const prompt = body.prompt;
  if (!prompt || typeof prompt !== "string") {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing prompt" }));
    return;
  }

  try {
    const kimiRes = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "kimi-k2.5",
        messages: [
          {
            role: "system",
            content:
              "You are an expert movement analyst. Always respond with valid JSON only, no markdown.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 1,
      }),
    });

    const data = await kimiRes.json();

    if (!kimiRes.ok) {
      const msg =
        data?.error?.message || data?.message || `Kimi API error (${kimiRes.status})`;
      res.writeHead(kimiRes.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: msg }));
      return;
    }

    const content = data?.choices?.[0]?.message?.content ?? "";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ content }));
  } catch (err) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Failed to reach Kimi API",
      }),
    );
  }
}
