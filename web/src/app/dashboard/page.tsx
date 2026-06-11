import Link from "next/link";
import { Upload, History, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAnalysesByUser } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, formatTimestamp } from "@/lib/utils";
import { redirect } from "next/navigation";
import { getLoginUrl } from "@/lib/auth-urls";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(getLoginUrl("/dashboard"));

  const analyses = getAnalysesByUser(user.id);
  const recent = analyses.slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-2 text-slate-400">
          Welcome back{user.email ? `, ${user.email.split("@")[0]}` : ""}. Ready to analyze your next climb?
        </p>
      </div>

      <div className="mb-12 grid gap-4 sm:grid-cols-3">
        <Link href="/upload">
          <Card className="cursor-pointer transition-colors hover:border-cyan-500/30 hover:bg-cyan-500/5">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
                <Upload className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Upload climb</p>
                <p className="text-sm text-slate-400">Analyze a new video</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/history">
          <Card className="cursor-pointer transition-colors hover:border-teal-500/30 hover:bg-teal-500/5">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10">
                <History className="h-6 w-6 text-teal-400" />
              </div>
              <div>
                <p className="font-semibold text-white">View history</p>
                <p className="text-sm text-slate-400">{analyses.length} analyses</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
              <BarChart3 className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Avg efficiency</p>
              <p className="text-sm text-slate-400">
                {analyses.length
                  ? Math.round(
                      analyses.reduce((s, a) => s + a.movementEfficiency, 0) /
                        analyses.length
                    )
                  : "—"}
                {analyses.length ? "/100" : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent analyses</CardTitle>
          <Link href="/history">
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-400">No analyses yet.</p>
              <Link href="/upload" className="mt-4 inline-block">
                <Button>Upload your first climb</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((a) => (
                <Link
                  key={a.id}
                  href={`/analysis/${a.id}`}
                  className="flex items-center justify-between rounded-lg border border-white/8 bg-white/3 p-4 transition-colors hover:border-cyan-500/20 hover:bg-white/5"
                >
                  <div>
                    <p className="font-medium text-white">{a.title}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(a.createdAt).toLocaleDateString()} ·{" "}
                      {formatDuration(a.duration)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-cyan-400">
                      {a.movementEfficiency}/100
                    </p>
                    <p className="text-xs text-slate-500">efficiency</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
