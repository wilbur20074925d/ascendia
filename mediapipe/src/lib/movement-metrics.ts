import type { JointAngles, LandmarkPoint, MovementMetrics, MovementSample } from './movement-types';

const POSE = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

function dist(a: LandmarkPoint, b: LandmarkPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function angleAt(a: LandmarkPoint, b: LandmarkPoint, c: LandmarkPoint): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAb = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
  const magCb = Math.sqrt(cb.x * cb.x + cb.y * cb.y);
  if (magAb === 0 || magCb === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (magAb * magCb)));
  return (Math.acos(cos) * 180) / Math.PI;
}

function getPosePoint(landmarks: LandmarkPoint[] | undefined, index: number): LandmarkPoint | null {
  if (!landmarks?.[index]) return null;
  const p = landmarks[index];
  if ((p.visibility ?? 1) < 0.3) return null;
  return p;
}

function computeAngles(landmarks: LandmarkPoint[]): JointAngles | null {
  const ls = getPosePoint(landmarks, POSE.LEFT_SHOULDER);
  const rs = getPosePoint(landmarks, POSE.RIGHT_SHOULDER);
  const le = getPosePoint(landmarks, POSE.LEFT_ELBOW);
  const re = getPosePoint(landmarks, POSE.RIGHT_ELBOW);
  const lw = getPosePoint(landmarks, POSE.LEFT_WRIST);
  const rw = getPosePoint(landmarks, POSE.RIGHT_WRIST);
  const lh = getPosePoint(landmarks, POSE.LEFT_HIP);
  const rh = getPosePoint(landmarks, POSE.RIGHT_HIP);
  const lk = getPosePoint(landmarks, POSE.LEFT_KNEE);
  const rk = getPosePoint(landmarks, POSE.RIGHT_KNEE);
  const la = getPosePoint(landmarks, POSE.LEFT_ANKLE);
  const ra = getPosePoint(landmarks, POSE.RIGHT_ANKLE);
  const nose = getPosePoint(landmarks, POSE.NOSE);

  if (!ls || !rs || !le || !re || !lw || !rw || !lh || !rh || !lk || !rk || !la || !ra || !nose) {
    return null;
  }

  return {
    leftElbow: angleAt(ls, le, lw),
    rightElbow: angleAt(rs, re, rw),
    leftKnee: angleAt(lh, lk, la),
    rightKnee: angleAt(rh, rk, ra),
    leftShoulder: angleAt(le, ls, lh),
    rightShoulder: angleAt(re, rs, rh),
  };
}

function hipCenter(landmarks: LandmarkPoint[]): LandmarkPoint | null {
  const lh = getPosePoint(landmarks, POSE.LEFT_HIP);
  const rh = getPosePoint(landmarks, POSE.RIGHT_HIP);
  if (!lh || !rh) return null;
  return { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2, z: ((lh.z ?? 0) + (rh.z ?? 0)) / 2 };
}

function handCenter(landmarks: LandmarkPoint[] | undefined): LandmarkPoint | null {
  if (!landmarks?.length) return null;
  const wrist = landmarks[0];
  if (!wrist) return null;
  return wrist;
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

export function computeMovementMetrics(
  samples: MovementSample[],
  startedAt: number,
  endedAt: number,
): MovementMetrics {
  const duration = Math.max(endedAt - startedAt, 1);
  const poseSamples = samples.filter((s) => s.poseDetected && s.poseLandmarks?.length);

  const velocityTimeline: { t: number; v: number }[] = [];
  const angleTimeline: { t: number; angles: JointAngles }[] = [];
  const velocities: number[] = [];
  const hipPositions: LandmarkPoint[] = [];
  const leftHandPositions: LandmarkPoint[] = [];
  const rightHandPositions: LandmarkPoint[] = [];
  const allAngles: JointAngles[] = [];

  let prevHip: LandmarkPoint | null = null;
  let prevTime = 0;

  for (const sample of poseSamples) {
    const landmarks = sample.poseLandmarks!;
    const hip = hipCenter(landmarks);
    const angles = computeAngles(landmarks);

    if (angles) {
      allAngles.push(angles);
      angleTimeline.push({ t: sample.timestamp - startedAt, angles });
    }

    if (hip) {
      hipPositions.push(hip);
      if (prevHip && sample.timestamp > prevTime) {
        const dt = (sample.timestamp - prevTime) / 1000;
        const v = dist(hip, prevHip) / dt;
        velocities.push(v);
        velocityTimeline.push({ t: sample.timestamp - startedAt, v });
      }
      prevHip = hip;
      prevTime = sample.timestamp;
    }

    const lh = handCenter(sample.leftHandLandmarks);
    const rh = handCenter(sample.rightHandLandmarks);
    if (lh) leftHandPositions.push(lh);
    if (rh) rightHandPositions.push(rh);
  }

  const avgVelocity = avg(velocities);
  const maxVelocity = velocities.length ? Math.max(...velocities) : 0;

  let hipVariance = 0;
  if (hipPositions.length > 1) {
    const meanX = avg(hipPositions.map((p) => p.x));
    const meanY = avg(hipPositions.map((p) => p.y));
    hipVariance = avg(hipPositions.map((p) => (p.x - meanX) ** 2 + (p.y - meanY) ** 2));
  }

  const postureStability = clamp(100 - hipVariance * 8000);
  const balanceScore = clamp(
    100 -
      (allAngles.length
        ? avg(allAngles.map((a) => Math.abs(a.leftShoulder - a.rightShoulder))) * 0.8
        : 50),
  );

  const handActivity = (positions: LandmarkPoint[]) => {
    if (positions.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < positions.length; i++) {
      total += dist(positions[i], positions[i - 1]);
    }
    return total;
  };

  const leftHandActivity = handActivity(leftHandPositions);
  const rightHandActivity = handActivity(rightHandPositions);
  const totalHand = leftHandActivity + rightHandActivity || 1;

  const avgAngles: JointAngles = {
    leftElbow: avg(allAngles.map((a) => a.leftElbow)),
    rightElbow: avg(allAngles.map((a) => a.rightElbow)),
    leftKnee: avg(allAngles.map((a) => a.leftKnee)),
    rightKnee: avg(allAngles.map((a) => a.rightKnee)),
    leftShoulder: avg(allAngles.map((a) => a.leftShoulder)),
    rightShoulder: avg(allAngles.map((a) => a.rightShoulder)),
  };

  const upperBodyMotion = avg([avgAngles.leftShoulder, avgAngles.rightShoulder, avgAngles.leftElbow, avgAngles.rightElbow]);
  const lowerBodyMotion = avg([avgAngles.leftKnee, avgAngles.rightKnee]);
  const coreMotion = avg([postureStability, balanceScore]);

  return {
    sessionDurationMs: duration,
    totalFrames: samples.length,
    poseDetectionRate: samples.length ? (poseSamples.length / samples.length) * 100 : 0,
    avgMovementVelocity: avgVelocity,
    maxMovementVelocity: maxVelocity,
    postureStability,
    balanceScore,
    leftHandActivity,
    rightHandActivity,
    avgJointAngles: avgAngles,
    velocityTimeline: velocityTimeline.slice(-120),
    angleTimeline: angleTimeline.slice(-120),
    bodyRegionActivity: {
      upperBody: clamp(upperBodyMotion),
      core: clamp(coreMotion),
      lowerBody: clamp(lowerBodyMotion),
      hands: clamp((totalHand / (poseSamples.length || 1)) * 200),
    },
  };
}
