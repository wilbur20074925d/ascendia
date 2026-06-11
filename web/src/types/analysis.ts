export type KeypointName =
  | "left_shoulder"
  | "right_shoulder"
  | "left_elbow"
  | "right_elbow"
  | "left_wrist"
  | "right_wrist"
  | "left_hip"
  | "right_hip"
  | "left_knee"
  | "right_knee"
  | "left_ankle"
  | "right_ankle";

export interface Keypoint {
  x: number;
  y: number;
  confidence: number;
}

export interface FrameData {
  frameIndex: number;
  timestamp: number;
  keypoints: Partial<Record<KeypointName, Keypoint>>;
}

export type EventType =
  | "pause"
  | "foot_slip"
  | "dynamic_reach"
  | "inefficient_movement"
  | "hip_drift"
  | "unstable_position";

export interface MovementEvent {
  type: EventType;
  timestamp: number;
  description: string;
}

export interface AnalysisMetrics {
  climbDuration: number;
  totalHandMovement: number;
  totalFootMovement: number;
  averageHipStability: number;
  pauseCount: number;
  highEffortMoveCount: number;
  smoothness: number;
  movementEfficiency: number;
  hipStability: number;
  footSlipCount: number;
  dynamicMoveCount: number;
}

export interface AiFeedback {
  summary: string;
  strengths: string[];
  improvements: string[];
  drills: string[];
  coachNote: string;
  timestampedFeedback: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface AnalysisResult {
  id: string;
  videoId: string;
  userId: string;
  title: string;
  videoPath: string;
  duration: number;
  fps: number;
  width: number;
  height: number;
  frames: FrameData[];
  metrics: AnalysisMetrics;
  events: MovementEvent[];
  aiFeedback: AiFeedback | null;
  status: "processing" | "complete" | "error";
  createdAt: string;
  usedMockData: boolean;
}

export interface AnalysisSummary {
  id: string;
  videoId: string;
  title: string;
  duration: number;
  status: AnalysisResult["status"];
  movementEfficiency: number;
  smoothness: number;
  createdAt: string;
  thumbnailPath?: string;
}
