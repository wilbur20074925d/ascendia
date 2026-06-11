export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface MovementSample {
  timestamp: number;
  poseDetected: boolean;
  poseLandmarks?: LandmarkPoint[];
  leftHandLandmarks?: LandmarkPoint[];
  rightHandLandmarks?: LandmarkPoint[];
}

export interface JointAngles {
  leftElbow: number;
  rightElbow: number;
  leftKnee: number;
  rightKnee: number;
  leftShoulder: number;
  rightShoulder: number;
}

export interface MovementMetrics {
  sessionDurationMs: number;
  totalFrames: number;
  poseDetectionRate: number;
  avgMovementVelocity: number;
  maxMovementVelocity: number;
  postureStability: number;
  balanceScore: number;
  leftHandActivity: number;
  rightHandActivity: number;
  avgJointAngles: JointAngles;
  velocityTimeline: { t: number; v: number }[];
  angleTimeline: { t: number; angles: JointAngles }[];
  bodyRegionActivity: {
    upperBody: number;
    core: number;
    lowerBody: number;
    hands: number;
  };
}

export interface AiAnalysisResult {
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  movementQuality: {
    label: string;
    score: number;
  }[];
  rawText?: string;
}

export interface MovementSession {
  id: string;
  startedAt: number;
  endedAt: number | null;
  samples: MovementSample[];
  metrics: MovementMetrics | null;
  aiAnalysis: AiAnalysisResult | null;
  isRecording: boolean;
}
