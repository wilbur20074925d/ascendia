"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Upload, Video, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Stage = "idle" | "uploading" | "analyzing" | "complete" | "error";

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("video/") && !f.name.match(/\.(mp4|mov|webm)$/i)) {
      setError("Please upload an MP4 or MOV video file.");
      return;
    }
    setFile(f);
    setError(null);
    setTitle(f.name.replace(/\.[^.]+$/, ""));
    setPreview(URL.createObjectURL(f));
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function getVideoMetadata(videoUrl: string): Promise<{
    duration: number;
    width: number;
    height: number;
  }> {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration || 30,
          width: video.videoWidth || 1280,
          height: video.videoHeight || 720,
        });
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => resolve({ duration: 30, width: 1280, height: 720 });
      video.src = videoUrl;
    });
  }

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setStage("uploading");
    setProgress(10);

    try {
      const metadata = preview
        ? await getVideoMetadata(preview)
        : { duration: 30, width: 1280, height: 720 };

      const formData = new FormData();
      formData.append("video", file);
      formData.append("title", title || "Untitled climb");

      setProgress(30);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        throw new Error(data.error || "Upload failed");
      }

      const { videoId, filename } = await uploadRes.json();
      setProgress(60);
      setStage("analyzing");

      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          filename,
          title: title || "Untitled climb",
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          fps: 30,
        }),
      });

      if (!analyzeRes.ok) {
        const data = await analyzeRes.json();
        throw new Error(data.error || "Analysis failed");
      }

      const { analysisId } = await analyzeRes.json();
      setProgress(100);
      setStage("complete");

      setTimeout(() => {
        router.push(`/analysis/${analysisId}`);
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("error");
    }
  }

  const stageLabel = {
    idle: "",
    uploading: "Uploading video…",
    analyzing: "Running pose analysis…",
    complete: "Analysis complete!",
    error: "Error",
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Upload climb video</h1>
        <p className="mt-2 text-slate-400">
          Upload a side-view or front-view MP4/MOV of your bouldering session.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select video</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 transition-colors ${
                dragOver
                  ? "border-cyan-500 bg-cyan-500/10"
                  : "border-white/15 bg-white/3 hover:border-white/25 hover:bg-white/5"
              }`}
            >
              <Upload className="mb-4 h-12 w-12 text-slate-500" />
              <p className="font-medium text-white">Drop your video here</p>
              <p className="mt-1 text-sm text-slate-500">or click to browse · MP4, MOV</p>
              <input
                ref={inputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/mov,video/webm,.mp4,.mov,.webm"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
                {preview && (
                  <video
                    src={preview}
                    className="max-h-64 w-full object-contain"
                    controls
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setStage("idle");
                    setProgress(0);
                  }}
                  className="absolute top-3 right-3 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/3 p-3">
                <Video className="h-5 w-5 text-cyan-400" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-white">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">
                  Climb title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. V4 crimp problem"
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50"
                />
              </div>
            </motion.div>
          )}

          {stage !== "idle" && stage !== "error" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{stageLabel[stage]}</span>
                <span className="text-cyan-400">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {error && (
            <p className="text-center text-sm text-rose-400">{error}</p>
          )}

          <Button
            className="w-full gap-2"
            disabled={!file || stage === "uploading" || stage === "analyzing"}
            onClick={handleUpload}
          >
            {(stage === "uploading" || stage === "analyzing") && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {stage === "uploading"
              ? "Uploading…"
              : stage === "analyzing"
                ? "Analyzing…"
                : stage === "complete"
                  ? "Redirecting…"
                  : "Analyze climb"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
