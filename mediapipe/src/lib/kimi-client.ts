import type { AiAnalysisResult, MovementMetrics } from './movement-types';

function getApiUrl(): string {
  return '/api/kimi';
}

async function readApiResponse(response: Response): Promise<{ content?: string; error?: string }> {
  const text = await response.text();
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text) as { content?: string; error?: string };
    } catch {
      throw new Error('Invalid JSON from analysis API.');
    }
  }

  if (text.trimStart().startsWith('<!')) {
    throw new Error(
      'Analysis API returned HTML instead of JSON. Restart the dev server (npm run dev) so /api/kimi is registered.',
    );
  }

  throw new Error(text.slice(0, 200) || `Analysis API error (${response.status})`);
}

function parseAiResponse(text: string): AiAnalysisResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as Partial<AiAnalysisResult>;
      return {
        overallScore: clamp(parsed.overallScore ?? 70, 0, 100),
        summary: parsed.summary ?? text.slice(0, 500),
        strengths: parsed.strengths ?? [],
        improvements: parsed.improvements ?? [],
        recommendations: parsed.recommendations ?? [],
        movementQuality: parsed.movementQuality ?? [],
        rawText: text,
      };
    } catch {
      /* fall through */
    }
  }

  return {
    overallScore: 70,
    summary: text,
    strengths: [],
    improvements: [],
    recommendations: [],
    movementQuality: [],
    rawText: text,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function analyzeMovementWithKimi(metrics: MovementMetrics): Promise<AiAnalysisResult> {
  const prompt = `You are an expert movement analyst for ASCENDIA, a holistic body-tracking platform using MediaPipe Holistic Landmarker.

Analyze the following movement session data captured from real-time pose, hand, and body tracking. Respond ONLY with valid JSON (no markdown fences) in this exact shape:
{
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence overview>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area 1>", "<area 2>", "<area 3>"],
  "recommendations": ["<actionable tip 1>", "<actionable tip 2>", "<actionable tip 3>"],
  "movementQuality": [
    {"label": "Posture", "score": <0-100>},
    {"label": "Balance", "score": <0-100>},
    {"label": "Coordination", "score": <0-100>},
    {"label": "Fluidity", "score": <0-100>},
    {"label": "Symmetry", "score": <0-100>}
  ]
}

Movement session metrics:
- Duration: ${(metrics.sessionDurationMs / 1000).toFixed(1)} seconds
- Frames captured: ${metrics.totalFrames}
- Pose detection rate: ${metrics.poseDetectionRate.toFixed(1)}%
- Average movement velocity: ${metrics.avgMovementVelocity.toFixed(4)}
- Max movement velocity: ${metrics.maxMovementVelocity.toFixed(4)}
- Posture stability: ${metrics.postureStability.toFixed(1)}/100
- Balance score: ${metrics.balanceScore.toFixed(1)}/100
- Left hand activity: ${metrics.leftHandActivity.toFixed(4)}
- Right hand activity: ${metrics.rightHandActivity.toFixed(4)}
- Average joint angles (degrees):
  - Left elbow: ${metrics.avgJointAngles.leftElbow.toFixed(1)}
  - Right elbow: ${metrics.avgJointAngles.rightElbow.toFixed(1)}
  - Left knee: ${metrics.avgJointAngles.leftKnee.toFixed(1)}
  - Right knee: ${metrics.avgJointAngles.rightKnee.toFixed(1)}
  - Left shoulder: ${metrics.avgJointAngles.leftShoulder.toFixed(1)}
  - Right shoulder: ${metrics.avgJointAngles.rightShoulder.toFixed(1)}
- Body region activity:
  - Upper body: ${metrics.bodyRegionActivity.upperBody.toFixed(1)}
  - Core: ${metrics.bodyRegionActivity.core.toFixed(1)}
  - Lower body: ${metrics.bodyRegionActivity.lowerBody.toFixed(1)}
  - Hands: ${metrics.bodyRegionActivity.hands.toFixed(1)}`;

  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  const data = await readApiResponse(response);

  if (!response.ok) {
    throw new Error(data.error || `Kimi API error (${response.status})`);
  }
  if (data.error) throw new Error(data.error);
  if (!data.content) throw new Error('Empty response from Kimi API');

  return parseAiResponse(data.content);
}
