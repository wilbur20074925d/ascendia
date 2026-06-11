import type { AiAnalysisResult, MovementMetrics, MovementSample } from './movement-types';
import { computeMovementMetrics } from './movement-metrics';

const MAX_SAMPLES = 600;
const STORAGE_KEY = 'ascendia-movement-session';

type Listener = () => void;

export interface MovementSessionState {
  id: string;
  startedAt: number;
  endedAt: number | null;
  samples: MovementSample[];
  metrics: MovementMetrics | null;
  aiAnalysis: AiAnalysisResult | null;
  isRecording: boolean;
}

function createEmptySession(): MovementSessionState {
  return {
    id: crypto.randomUUID(),
    startedAt: Date.now(),
    endedAt: null,
    samples: [],
    metrics: null,
    aiAnalysis: null,
    isRecording: false,
  };
}

class MovementStore {
  private session: MovementSessionState = createEmptySession();
  private listeners = new Set<Listener>();
  private sampleCounter = 0;
  private readonly sampleEveryN = 2;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  getSession(): MovementSessionState {
    return { ...this.session, samples: [...this.session.samples] };
  }

  startRecording() {
    if (this.session.isRecording) return;
    this.session = createEmptySession();
    this.session.isRecording = true;
    this.sampleCounter = 0;
    this.notify();
  }

  stopRecording() {
    if (!this.session.isRecording) return;
    this.session.isRecording = false;
    this.session.endedAt = Date.now();
    this.session.metrics = computeMovementMetrics(this.session.samples, this.session.startedAt, this.session.endedAt);
    this.persist();
    this.notify();
  }

  clearSession() {
    this.session = createEmptySession();
    this.sampleCounter = 0;
    localStorage.removeItem(STORAGE_KEY);
    this.notify();
  }

  addSample(sample: MovementSample) {
    if (!this.session.isRecording) return;

    this.sampleCounter += 1;
    if (this.sampleCounter % this.sampleEveryN !== 0) return;
    if (this.session.samples.length >= MAX_SAMPLES) return;

    this.session.samples.push(sample);
    if (this.session.samples.length % 10 === 0) {
      this.persist();
    }
    this.notify();
  }

  setAiAnalysis(analysis: AiAnalysisResult) {
    this.session.aiAnalysis = analysis;
    this.persist();
    this.notify();
  }

  recomputeMetrics() {
    const end = this.session.endedAt ?? Date.now();
    this.session.metrics = computeMovementMetrics(this.session.samples, this.session.startedAt, end);
    this.persist();
    this.notify();
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as MovementSessionState;
      if (parsed?.samples?.length) {
        this.session = { ...parsed, isRecording: false };
        if (!this.session.metrics) {
          this.session.metrics = computeMovementMetrics(
            this.session.samples,
            this.session.startedAt,
            this.session.endedAt ?? Date.now(),
          );
        }
        this.notify();
      }
    } catch {
      /* ignore corrupt storage */
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.session));
    } catch {
      /* storage full */
    }
  }
}

export const movementStore = new MovementStore();
