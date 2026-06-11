"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, Upload, Loader2, BarChart3 } from "lucide-react";
import type { AnalysisSummary } from "@/types/analysis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/history");
        if (res.ok) {
          const data = await res.json();
          setAnalyses(data);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
            <History className="h-8 w-8 text-cyan-400" />
            Climb history
          </h1>
          <p className="mt-2 text-slate-400">All your analyzed climbing sessions</p>
        </div>
        <Link href="/upload">
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            New analysis
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      ) : analyses.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-slate-600" />
            <p className="mt-4 text-slate-400">No analyses yet</p>
            <Link href="/upload" className="mt-6 inline-block">
              <Button>Upload your first climb</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {analyses.map((a) => (
            <Link key={a.id} href={`/analysis/${a.id}`}>
              <Card className="transition-colors hover:border-cyan-500/20 hover:bg-white/3">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="font-semibold text-white">{a.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(a.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {formatDuration(a.duration)}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-lg font-bold text-cyan-400">
                        {a.movementEfficiency}
                      </p>
                      <p className="text-xs text-slate-500">efficiency</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-teal-400">{a.smoothness}</p>
                      <p className="text-xs text-slate-500">smoothness</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        a.status === "complete"
                          ? "bg-teal-500/10 text-teal-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
