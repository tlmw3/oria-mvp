"use client";

import Link from "next/link";
import { Card } from "@/components/Card";
import { CardSkeleton } from "@/components/Skeleton";
import { useStreak, useUser, useActivities, useRecoverStreak } from "@/lib/hooks";
import { useToast } from "@/components/Toast";
import { formatMoney } from "@/lib/utils";

const MILESTONES = [1, 2, 4, 6, 8, 12, 16, 24];

const APY_TIERS: ReadonlyArray<readonly [number, number]> = [
  [16, 8.0], [12, 7.5], [8, 7.0], [6, 6.5], [4, 6.0], [2, 5.5], [1, 5.0], [0, 4.0],
];
function computeApy(s: number) {
  if (s <= 0) return 4.0;
  for (const [t, a] of APY_TIERS) if (s >= t) return a;
  return 4.0;
}

export default function StreakDetailPage() {
  const { data: streak, isLoading: streakLoading } = useStreak();
  const { data: user, isLoading: userLoading } = useUser();
  const { data: activities } = useActivities(52);
  const recoverStreak = useRecoverStreak();
  const { toast } = useToast();

  if (streakLoading || userLoading) {
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

  const count = streak?.currentCount ?? 0;
  const longest = streak?.longestCount ?? 0;
  const targetKm = user?.targetKm ?? 10;
  const currentKm = streak?.currentWeek?.distanceKm ?? 0;
  const pct = Math.min(100, Math.round((currentKm / targetKm) * 100));
  const canRecover = !streak?.lastWeekMet && count === 0 && longest > 0;

  // Build weekly history from activities
  const weekHistory = (activities ?? []).map((a) => ({
    week: new Date(a.weekStart).toLocaleDateString("en", { month: "short", day: "numeric" }),
    km: a.distanceKm,
    met: a.goalMet,
  })).reverse();

  // Next milestone
  const nextMilestone = MILESTONES.find((m) => m > count) ?? MILESTONES[MILESTONES.length - 1];
  const milestonePct = Math.min(100, Math.round((count / nextMilestone) * 100));

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1 pb-2">
        <Link href="/dashboard" className="w-9 h-9 rounded-xl bg-oria-card border border-oria flex items-center justify-center cursor-pointer active:scale-95 transition-transform">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Streak Details</h1>
      </div>

      {/* Big streak display */}
      <Card className="relative overflow-hidden !p-6 text-center">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(252,76,2,0.2)_0%,transparent_60%)] blur-[30px] pointer-events-none" />
        <div className="relative">
          <div className="w-[120px] h-[120px] rounded-full gradient-sport flex items-center justify-center shadow-sport-glow mx-auto">
            <span className="text-[56px] font-extrabold text-white leading-none tabular-nums">{count}</span>
          </div>
          <p className="text-lg font-bold text-text-primary mt-4">
            {count === 0 ? "No active streak" : `${count} week${count > 1 ? "s" : ""} strong`}
          </p>
          <p className="text-sm text-text-secondary mt-1">
            Longest ever: {longest} week{longest !== 1 ? "s" : ""}
          </p>
        </div>
      </Card>

      {/* Next milestone */}
      <Card className="!p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-gold">Next milestone</p>
          <span className="text-sm font-bold text-text-primary tabular-nums">{count} / {nextMilestone} weeks</span>
        </div>
        <div className="h-2 rounded-full bg-oria-chip overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-gold to-accent-sport transition-all duration-700"
            style={{ width: `${milestonePct}%` }}
          />
        </div>
        <p className="text-[12px] text-text-muted mt-2">
          {nextMilestone - count} more week{nextMilestone - count > 1 ? "s" : ""} to unlock {nextMilestone}-week badge
        </p>
      </Card>

      {/* APY impact */}
      <Card className="!p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">Streak APY Impact</p>
        <div className="flex flex-col gap-3">
          {MILESTONES.filter(m => m <= 20).map((m) => {
            const apyAtM = computeApy(m);
            const reached = count >= m;
            return (
              <div key={m} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                  reached ? "gradient-sport text-white" : m === nextMilestone ? "bg-accent-gold/15 border border-accent-gold/30 text-accent-gold" : "bg-oria-chip text-text-muted"
                }`}>
                  {m}
                </div>
                <div className="flex-1">
                  <div className="h-1.5 rounded-full bg-oria-chip overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${reached ? "gradient-sport" : "bg-oria-chip"}`}
                      style={{ width: `${(apyAtM / 8) * 100}%` }}
                    />
                  </div>
                </div>
                <span className={`text-[13px] font-semibold tabular-nums w-16 text-right ${reached ? "text-accent-sport" : "text-text-muted"}`}>
                  {apyAtM.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* This week status */}
      <Card className="!p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">This Week</p>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-[22px] font-extrabold text-text-primary tabular-nums leading-none">
              {currentKm.toFixed(1)}<span className="text-[13px] text-text-muted font-medium"> / {targetKm} km</span>
            </p>
            <p className="text-[12px] text-text-muted mt-1">
              {pct >= 100 ? "Goal reached!" : `${Math.max(0, targetKm - currentKm).toFixed(1)} km to go`}
            </p>
          </div>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${pct >= 100 ? "bg-success-500/15" : "bg-accent-sport/10"}`}>
            {pct >= 100 ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            ) : (
              <span className="text-[15px] font-bold text-accent-sport tabular-nums">{pct}%</span>
            )}
          </div>
        </div>
      </Card>

      {/* Streak recovery */}
      {canRecover && (
        <Card className="!p-4 border-accent-gold/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-accent-gold/15 border border-accent-gold/25 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-text-primary">Recover your streak</p>
              <p className="text-[12px] text-text-muted mt-0.5">Get back to {longest} weeks for {(() => { const f = formatMoney(5, user?.settings?.currency ?? "USD"); return `${f.symbol}${f.intPart}`; })()}</p>
            </div>
            <button
              onClick={() => recoverStreak.mutate(undefined, {
                onSuccess: () => toast("Streak recovered!"),
                onError: (e) => toast(e.message, "error"),
              })}
              disabled={recoverStreak.isPending}
              className="px-4 py-2 rounded-xl gradient-gold text-white text-sm font-semibold cursor-pointer border-none disabled:opacity-50"
            >
              {recoverStreak.isPending ? "..." : (() => { const f = formatMoney(5, user?.settings?.currency ?? "USD"); return `${f.symbol}${f.intPart}`; })()}
            </button>
          </div>
        </Card>
      )}

      {/* Week history */}
      {weekHistory.length > 0 && (
        <Card className="!p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">History</p>
          <div className="flex flex-col gap-2">
            {weekHistory.slice(-12).map((w, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${w.met ? "bg-success-500/20" : "bg-oria-chip"}`}>
                  {w.met ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-text-muted" />
                  )}
                </div>
                <span className="text-[13px] text-text-secondary flex-1">{w.week}</span>
                <span className="text-[13px] font-semibold text-text-primary tabular-nums">{w.km.toFixed(1)} km</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
