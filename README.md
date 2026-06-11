# Ascendia

Static site for the Ascendia climbing wearable ecosystem.

## Local development

```bash
npm install
npm run dev
```

- Ascendia site: [http://localhost:5173](http://localhost:5173)
- Sign in at [http://localhost:5173/login](http://localhost:5173/login)
- After login, MediaPipe demos: [http://localhost:5173/mediapipe-samples-web/](http://localhost:5173/mediapipe-samples-web/)

MediaPipe source lives in [`mediapipe/`](mediapipe/) ([google-ai-edge/mediapipe-samples-web](https://github.com/google-ai-edge/mediapipe-samples-web)).

## Production

```bash
npm start
```

Uses the `PORT` environment variable (defaults to 3000).

## GitHub Pages

Pushes to `main` deploy automatically via GitHub Actions. Enable Pages in the repo settings with **Source: GitHub Actions**.
