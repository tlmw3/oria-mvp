"use client";

import Link from "next/link";
import { Card } from "@/components/Card";
import { CardSkeleton } from "@/components/Skeleton";
import { ProgressChart } from "@/components/ProgressChart";
import { useActivities, useStreak, useUser } from "@/lib/hooks";

export default function ActivitiesPage() {
  const { data: activities, isLoading } = useActivities(52);
  const { data: streak } = useStreak();
  const { data: user } = useUser();

  const targetKm = user?.targetKm ?? 10;
  const currentKm = streak?.currentWeek?.distanceKm ?? 0;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 pt-1 pb-2">
          <Link href="/dashboard" className="w-9 h-9 rounded-xl bg-oria-card border border-oria flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <div className="h-7 w-32 skeleton-shimmer rounded" />
        </div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const sorted = [...(activities ?? [])].sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
  const totalKm = sorted.reduce((s, a) => s + a.distanceKm, 0);
  const goalMetWeeks = sorted.filter((a) => a.goalMet).length;
  const avgKm = sorted.length > 0 ? totalKm / sorted.length : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-1 pb-2">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="w-9 h-9 rounded-xl bg-oria-card border border-oria flex items-center justify-center cursor-pointer active:scale-95 transition-transform">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Activities</h1>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="!p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-accent-sport">Total</p>
          <p className="text-[20px] font-extrabold text-text-primary mt-1 tabular-nums leading-none">
            {totalKm.toFixed(0)}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">km</p>
        </Card>
        <Card className="!p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-accent-purple-bright">Avg/wk</p>
          <p className="text-[20px] font-extrabold text-text-primary mt-1 tabular-nums leading-none">
            {avgKm.toFixed(1)}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">km</p>
        </Card>
        <Card className="!p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-success-500">Goals</p>
          <p className="text-[20px] font-extrabold text-text-primary mt-1 tabular-nums leading-none">
            {goalMetWeeks}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">of {sorted.length} wks</p>
        </Card>
      </div>

      {/* This week highlight */}
      <Card className="!p-4 border-accent-sport/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-sport">This week</p>
            <p className="text-[28px] font-extrabold text-text-primary mt-1 tabular-nums leading-none">
              {currentKm.toFixed(1)}
              <span className="text-[14px] text-text-muted font-medium"> / {targetKm} km</span>
            </p>
          </div>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${currentKm >= targetKm ? "bg-success-500/15" : "bg-accent-sport/10"}`}>
            {currentKm >= targetKm ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            ) : (
              <span className="text-[15px] font-bold text-accent-sport tabular-nums">
                {Math.min(100, Math.round((currentKm / targetKm) * 100))}%
              </span>
            )}
          </div>
        </div>
        <div className="h-2 rounded-full bg-oria-chip overflow-hidden mt-3">
          <div
            className={`h-full rounded-full transition-all duration-700 ${currentKm >= targetKm ? "bg-success-500" : "bg-gradient-to-r from-accent-sport to-accent-gold"}`}
            style={{ width: `${Math.min(100, Math.round((currentKm / targetKm) * 100))}%` }}
          />
        </div>
      </Card>

      {/* Chart */}
      {activities && activities.length >= 2 && (
        <Card className="!p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">
            Weekly progress
          </p>
          <ProgressChart data={activities} targetKm={targetKm} />
        </Card>
      )}

      {/* Week-by-week list */}
      <Card className="!p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">All weeks</p>
        <div className="flex flex-col gap-0">
          {sorted.map((a, i) => {
            const weekDate = new Date(a.weekStart);
            const pct = Math.min(100, Math.round((a.distanceKm / targetKm) * 100));
            const isThisWeek = i === 0;
            return (
              <div key={a.id} className={`flex items-center gap-3 py-3 ${i < sorted.length - 1 ? "border-b border-oria" : ""}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.goalMet ? "bg-success-500/15" : "bg-oria-chip"}`}>
                  {a.goalMet ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  ) : (
                    <span className="text-[10px] font-bold text-text-muted tabular-nums">{pct}%</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-text-primary">
                      {weekDate.toLocaleDateString("en", { month: "short", day: "numeric" })}
                    </p>
                    {isThisWeek && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-accent-sport/15 text-accent-sport">Now</span>
                    )}
                  </div>
                  <div className="h-1 rounded-full bg-oria-chip overflow-hidden mt-1.5 max-w-[140px]">
                    <div
                      className={`h-full rounded-full ${a.goalMet ? "bg-success-500" : "bg-gradient-to-r from-accent-sport to-accent-gold"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[15px] font-bold text-text-primary tabular-nums">{a.distanceKm.toFixed(1)}</p>
                  <p className="text-[10px] text-text-muted">/ {targetKm} km</p>
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && (
            <p className="text-sm text-text-muted py-4 text-center">No activities yet — sync with Strava to import your runs.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
