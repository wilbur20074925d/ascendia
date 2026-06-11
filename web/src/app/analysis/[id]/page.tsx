"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/analysis/metric-card";
import { SkeletonCanvas } from "@/components/analysis/skeleton-canvas";
import { TrajectoryChart } from "@/components/analysis/trajectory-chart";
import { MovementTimeline } from "@/components/analysis/movement-timeline";
import { AiFeedbackPanel } from "@/components/analysis/ai-feedback-panel";
import { formatDuration } from "@/lib/utils";

export default function AnalysisPage() {
  const params = useParams();
  const id = params.id as string;
  const videoRef = useRef<HTMLVideoElement>(null);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "trajectories" | "feedback">(
    "overview"
  );

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const res = await fetch(`/api/analysis/${id}`);
        if (!res.ok) throw new Error("Failed to load analysis");
        const data = await res.json();
        setAnalysis(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading analysis");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalysis();
  }, [id]);

  const seekTo = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [analysis]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-400" />
        <p className="mt-4 text-slate-300">{error || "Analysis not found"}</p>
        <Link href="/history" className="mt-6 inline-block">
          <Button variant="secondary">Back to history</Button>
        </Link>
      </div>
    );
  }

  const { metrics, frames, events, aiFeedback } = analysis;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/history"
            className="mb-3 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to history
          </Link>
          <h1 className="text-2xl font-bold text-white md:text-3xl">{analysis.title}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {formatDuration(analysis.duration)} ·{" "}
            {new Date(analysis.createdAt).toLocaleString()}
            {analysis.usedMockData && (
              <span className="ml-2 rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                Demo analysis
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {(["overview", "trajectories", "feedback"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm capitalize transition-colors ${
                activeTab === tab
                  ? "bg-cyan-500/10 text-cyan-300"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Efficiency"
          value={metrics.movementEfficiency}
          unit="/100"
          accent="cyan"
          delay={0}
        />
        <MetricCard
          label="Smoothness"
          value={metrics.smoothness}
          unit="/100"
          accent="teal"
          delay={0.05}
        />
        <MetricCard
          label="Hip Stability"
          value={metrics.hipStability}
          unit="/100"
          accent="amber"
          delay={0.1}
        />
        <MetricCard
          label="Pauses"
          value={metrics.pauseCount}
          accent="rose"
          delay={0.15}
        />
      </div>

      {activeTab === "overview" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-6 lg:grid-cols-2"
        >
          {/* Video + controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Original video</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-hidden rounded-xl bg-black">
                <video
                  ref={videoRef}
                  src={analysis.videoPath}
                  className="w-full"
                  playsInline
                />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => {
                    if (videoRef.current?.paused) videoRef.current.play();
                    else videoRef.current?.pause();
                  }}
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => seekTo(0)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <input
                  type="range"
                  min={0}
                  max={analysis.duration}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  className="flex-1 accent-cyan-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Skeleton overlay */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pose skeleton & trajectories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl bg-slate-950">
                <SkeletonCanvas
                  frames={frames}
                  currentTime={currentTime}
                  width={analysis.width}
                  height={analysis.height}
                  showTrails
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" /> Hands
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Feet
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-violet-400" /> Hips
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-white" /> Center of mass
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Additional metrics */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Movement metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Climb duration", value: formatDuration(metrics.climbDuration) },
                  {
                    label: "Hand movement",
                    value: `${metrics.totalHandMovement}px`,
                  },
                  {
                    label: "Foot movement",
                    value: `${metrics.totalFootMovement}px`,
                  },
                  {
                    label: "High-effort moves",
                    value: metrics.highEffortMoveCount,
                  },
                  { label: "Foot slips", value: metrics.footSlipCount },
                  { label: "Dynamic reaches", value: metrics.dynamicMoveCount },
                  {
                    label: "Avg hip stability",
                    value: `${metrics.averageHipStability}/100`,
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-lg border border-white/8 bg-white/3 p-4"
                  >
                    <p className="text-xs text-slate-500">{m.label}</p>
                    <p className="mt-1 text-lg font-semibold text-white">{m.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Movement timeline & events</CardTitle>
            </CardHeader>
            <CardContent>
              <MovementTimeline
                events={events}
                duration={analysis.duration}
                currentTime={currentTime}
                onSeek={seekTo}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeTab === "trajectories" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-6 md:grid-cols-2"
        >
          <Card>
            <CardContent className="pt-6">
              <TrajectoryChart frames={frames} type="hands" title="Hand movement path" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <TrajectoryChart frames={frames} type="feet" title="Foot movement path" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <TrajectoryChart frames={frames} type="hips" title="Hip trajectory" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <TrajectoryChart
                frames={frames}
                type="com"
                title="Center of mass movement"
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeTab === "feedback" && aiFeedback && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AiFeedbackPanel feedback={aiFeedback} onSeek={seekTo} />
        </motion.div>
      )}
    </div>
  );
}
