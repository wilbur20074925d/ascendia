import type { AiAnalysisResult, JointAngles, MovementMetrics } from './movement-types';

export interface SymmetryAnalysis {
  elbow: number;
  knee: number;
  shoulder: number;
  overall: number;
  dominantSide: 'left' | 'right' | 'balanced';
}

export interface JointInsight {
  name: string;
  value: number;
  idealMin: number;
  idealMax: number;
  status: 'optimal' | 'low' | 'high';
  tip: string;
}

export interface TrainingTip {
  title: string;
  description: string;
  category: 'posture' | 'balance' | 'strength' | 'mobility' | 'coordination';
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

export interface RelatedResource {
  title: string;
  description: string;
  focus: string;
}

export interface PerformancePhase {
  label: string;
  startMs: number;
  endMs: number;
  intensity: 'low' | 'moderate' | 'high';
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function computeSymmetry(angles: JointAngles): SymmetryAnalysis {
  const elbowDiff = Math.abs(angles.leftElbow - angles.rightElbow);
  const kneeDiff = Math.abs(angles.leftKnee - angles.rightKnee);
  const shoulderDiff = Math.abs(angles.leftShoulder - angles.rightShoulder);

  const elbow = clamp(100 - elbowDiff * 1.5);
  const knee = clamp(100 - kneeDiff * 1.5);
  const shoulder = clamp(100 - shoulderDiff * 1.5);
  const overall = (elbow + knee + shoulder) / 3;

  let dominantSide: SymmetryAnalysis['dominantSide'] = 'balanced';
  const leftSum = angles.leftElbow + angles.leftKnee + angles.leftShoulder;
  const rightSum = angles.rightElbow + angles.rightKnee + angles.rightShoulder;
  if (leftSum - rightSum > 15) dominantSide = 'left';
  else if (rightSum - leftSum > 15) dominantSide = 'right';

  return { elbow, knee, shoulder, overall, dominantSide };
}

export function getJointInsights(angles: JointAngles): JointInsight[] {
  const joints: { name: string; value: number; idealMin: number; idealMax: number; lowTip: string; highTip: string }[] = [
    {
      name: 'Left Elbow',
      value: angles.leftElbow,
      idealMin: 60,
      idealMax: 150,
      lowTip: 'Increase elbow flexion range — try wall slides and tricep stretches.',
      highTip: 'Avoid over-flexion — focus on controlled extension during movement.',
    },
    {
      name: 'Right Elbow',
      value: angles.rightElbow,
      idealMin: 60,
      idealMax: 150,
      lowTip: 'Work on right arm mobility with band pull-aparts and arm circles.',
      highTip: 'Reduce excessive elbow bend — practice slow eccentric extensions.',
    },
    {
      name: 'Left Knee',
      value: angles.leftKnee,
      idealMin: 140,
      idealMax: 175,
      lowTip: 'Improve knee extension with seated leg raises and quad sets.',
      highTip: 'Deep knee flexion detected — strengthen glutes and hamstrings.',
    },
    {
      name: 'Right Knee',
      value: angles.rightKnee,
      idealMin: 140,
      idealMax: 175,
      lowTip: 'Right knee mobility may need attention — try step-ups and lunges.',
      highTip: 'Monitor right knee loading — add hip stability exercises.',
    },
    {
      name: 'Left Shoulder',
      value: angles.leftShoulder,
      idealMin: 30,
      idealMax: 120,
      lowTip: 'Open left shoulder with doorway stretches and Y-T-W raises.',
      highTip: 'Left shoulder elevation high — focus on scapular depression drills.',
    },
    {
      name: 'Right Shoulder',
      value: angles.rightShoulder,
      idealMin: 30,
      idealMax: 120,
      lowTip: 'Improve right shoulder ROM with band dislocations and wall angels.',
      highTip: 'Right shoulder may be compensating — check core engagement.',
    },
  ];

  return joints.map((j) => {
    let status: JointInsight['status'] = 'optimal';
    let tip = 'Within healthy functional range for dynamic movement.';
    if (j.value < j.idealMin) {
      status = 'low';
      tip = j.lowTip;
    } else if (j.value > j.idealMax) {
      status = 'high';
      tip = j.highTip;
    }
    return { name: j.name, value: j.value, idealMin: j.idealMin, idealMax: j.idealMax, status, tip };
  });
}

export function detectPerformancePhases(metrics: MovementMetrics): PerformancePhase[] {
  const data = metrics.velocityTimeline;
  if (data.length < 4) return [];

  const avg = data.reduce((s, d) => s + d.v, 0) / data.length;
  const phases: PerformancePhase[] = [];
  let phaseStart = data[0].t;
  let currentIntensity: PerformancePhase['intensity'] = 'low';

  const intensityOf = (v: number): PerformancePhase['intensity'] => {
    if (v > avg * 1.5) return 'high';
    if (v > avg * 0.7) return 'moderate';
    return 'low';
  };

  for (let i = 1; i < data.length; i++) {
    const intensity = intensityOf(data[i].v);
    if (intensity !== currentIntensity || i === data.length - 1) {
      phases.push({
        label: `${currentIntensity.charAt(0).toUpperCase() + currentIntensity.slice(1)} activity`,
        startMs: phaseStart,
        endMs: data[i].t,
        intensity: currentIntensity,
      });
      phaseStart = data[i].t;
      currentIntensity = intensity;
    }
  }
  return phases.slice(0, 8);
}

export function generateTrainingTips(metrics: MovementMetrics, symmetry: SymmetryAnalysis): TrainingTip[] {
  const tips: TrainingTip[] = [];

  if (metrics.postureStability < 70) {
    tips.push({
      title: 'Core Stability Foundation',
      description:
        'Your hip center showed significant drift. Practice dead bugs, bird dogs, and plank holds to stabilize your core during movement.',
      category: 'posture',
      priority: 'high',
      icon: 'fitness_center',
    });
  }

  if (metrics.balanceScore < 70) {
    tips.push({
      title: 'Single-Leg Balance Work',
      description:
        'Balance asymmetry detected between shoulders. Try single-leg stands, Bosu ball exercises, and tandem walking drills.',
      category: 'balance',
      priority: 'high',
      icon: 'balance',
    });
  }

  if (symmetry.overall < 75) {
    tips.push({
      title: 'Unilateral Strength Training',
      description: `Movement favors your ${symmetry.dominantSide === 'balanced' ? 'midline' : symmetry.dominantSide} side. Add single-arm rows, single-leg RDLs, and pallof presses to correct imbalances.`,
      category: 'strength',
      priority: 'high',
      icon: 'swap_horiz',
    });
  }

  if (metrics.avgMovementVelocity < 0.02) {
    tips.push({
      title: 'Dynamic Movement Progression',
      description:
        'Movement velocity was low. Gradually introduce tempo changes, reactive drills, and sport-specific patterns to build movement speed.',
      category: 'coordination',
      priority: 'medium',
      icon: 'speed',
    });
  } else if (metrics.maxMovementVelocity > metrics.avgMovementVelocity * 3) {
    tips.push({
      title: 'Smooth Movement Transitions',
      description:
        'Sharp velocity spikes suggest abrupt transitions. Practice controlled eccentric phases and flow-based movement sequences.',
      category: 'coordination',
      priority: 'medium',
      icon: 'waves',
    });
  }

  const handDiff = Math.abs(metrics.leftHandActivity - metrics.rightHandActivity);
  const handTotal = metrics.leftHandActivity + metrics.rightHandActivity;
  if (handTotal > 0.01 && handDiff / handTotal > 0.4) {
    tips.push({
      title: 'Hand Coordination Drills',
      description:
        'Uneven hand activity detected. Practice bilateral coordination with ball tosses, juggling progressions, and mirror hand exercises.',
      category: 'coordination',
      priority: 'medium',
      icon: 'back_hand',
    });
  }

  if (metrics.bodyRegionActivity.lowerBody < 40) {
    tips.push({
      title: 'Lower Body Activation',
      description:
        'Lower body engagement was limited. Include squats, hip hinges, and calf raises to build a stronger movement foundation.',
      category: 'strength',
      priority: 'medium',
      icon: 'directions_run',
    });
  }

  if (metrics.poseDetectionRate < 80) {
    tips.push({
      title: 'Optimize Tracking Setup',
      description:
        'Pose detection dropped below optimal. Ensure full body is visible, improve lighting, and stand 1.5–2m from the camera.',
      category: 'mobility',
      priority: 'low',
      icon: 'videocam',
    });
  }

  if (tips.length < 4) {
    tips.push({
      title: 'Mobility Maintenance Routine',
      description:
        'Add a daily 10-minute mobility flow targeting hips, thoracic spine, and shoulders to maintain your current movement quality.',
      category: 'mobility',
      priority: 'low',
      icon: 'self_improvement',
    });
  }

  return tips.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

export function getRelatedResources(metrics: MovementMetrics): RelatedResource[] {
  const resources: RelatedResource[] = [
    {
      title: 'Holistic Landmarker — Live Tracking',
      description: 'Record a new session with real-time pose, face, and hand landmark detection.',
      focus: 'Data capture',
    },
    {
      title: 'Posture & Alignment Guide',
      description: 'Learn how shoulder-hip stacking affects balance scores and movement efficiency.',
      focus: 'Biomechanics',
    },
    {
      title: 'Velocity-Based Training',
      description: 'Understand how movement speed correlates with power output and athletic performance.',
      focus: 'Performance',
    },
  ];

  if (metrics.balanceScore < 75) {
    resources.push({
      title: 'Balance Training Protocol',
      description: 'Progressive balance exercises from static holds to dynamic perturbation training.',
      focus: 'Balance',
    });
  }

  if (metrics.bodyRegionActivity.hands > 60) {
    resources.push({
      title: 'Fine Motor & Grip Training',
      description: 'Hand-heavy sessions benefit from grip strength work and proprioceptive drills.',
      focus: 'Hands',
    });
  }

  return resources;
}

export function computeOverallScore(metrics: MovementMetrics, symmetry: SymmetryAnalysis, ai?: AiAnalysisResult | null): number {
  if (ai?.overallScore) return ai.overallScore;
  return Math.round(
    metrics.postureStability * 0.25 +
      metrics.balanceScore * 0.25 +
      symmetry.overall * 0.2 +
      metrics.poseDetectionRate * 0.15 +
      clamp(metrics.bodyRegionActivity.core) * 0.15,
  );
}

export function getOverviewSummary(metrics: MovementMetrics, symmetry: SymmetryAnalysis): string {
  const parts: string[] = [];

  if (metrics.postureStability >= 80) parts.push('stable posture');
  else if (metrics.postureStability < 60) parts.push('postural drift');

  if (symmetry.overall >= 80) parts.push('good bilateral symmetry');
  else if (symmetry.overall < 65) parts.push('left-right asymmetry');

  if (metrics.avgMovementVelocity > 0.05) parts.push('dynamic movement patterns');
  else parts.push('controlled, low-velocity movement');

  if (metrics.poseDetectionRate >= 90) parts.push('excellent tracking quality');
  else if (metrics.poseDetectionRate < 70) parts.push('intermittent tracking gaps');

  return `Your session shows ${parts.join(', ')} over ${(metrics.sessionDurationMs / 1000).toFixed(0)} seconds of captured data.`;
}
