"use client";

import Link from "next/link";
import { Card } from "@/components/Card";
import { CardSkeleton } from "@/components/Skeleton";
import { useStreak, useUser } from "@/lib/hooks";

const SCORE_BREAKDOWN = [
  { key: "streak", label: "Streak (palier)", weight: 0.6 },
  { key: "regularity", label: "Regularity (3+ sessions/week)", weight: 0.15 },
  { key: "longRun", label: "Long run target hit", weight: 0.15 },
  { key: "progression", label: "Pace progression", weight: 0.1 },
];

export default function ApyDetailPage() {
  const { data: streak, isLoading: streakLoading } = useStreak();
  const { data: user, isLoading: userLoading } = useUser();

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

  const b = streak?.apyBreakdown;
  const vaultRate = b?.vaultRate ?? 0;
  const spread = b?.spread ?? 1;
  const baseline = b?.baseline ?? 3;
  const poolRate = b?.poolRate ?? 0;
  const myBonus = b?.bonus ?? 0;
  const effective = b?.effective ?? baseline;
  const meanScore = b?.meanScore ?? 0;
  const score = streak?.activityScore ?? 0;
  const count = streak?.currentCount ?? 0;
  const weekSessions = streak?.weekSessions ?? 0;
  const longestRun = streak?.weekLongestRun ?? 0;
  const targetKm = user?.targetKm ?? 10;
  const plan = user?.settings?.runPlan;
  const longRunTarget = plan?.longRunKm && plan.longRunKm > 0 ? plan.longRunKm : targetKm * 1.5;

  // Live score components (mirror backend logic for display)
  const streakComp = 0.6 * Math.min(1, Math.max(0, count / 16));
  const regularityComp = weekSessions >= 3 ? 0.15 : 0;
  const longRunComp = longestRun >= longRunTarget ? 0.15 : 0;
  const progressionComp = (streak?.monthAvgPace ?? 0) > 0 && (streak?.prevMonthAvgPace ?? 0) > 0 && (streak?.monthAvgPace ?? 0) < (streak?.prevMonthAvgPace ?? 0) ? 0.1 : 0;
  const scoreComponents: Record<string, number> = {
    streak: streakComp,
    regularity: regularityComp,
    longRun: longRunComp,
    progression: progressionComp,
  };

  const relativeRatio = meanScore > 0 ? score / meanScore : 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1 pb-2">
        <Link href="/dashboard" className="w-9 h-9 rounded-xl bg-oria-card border border-oria flex items-center justify-center cursor-pointer active:scale-95 transition-transform">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">APY Details</h1>
      </div>

      {/* Big APY display */}
      <Card className="relative overflow-hidden !p-6 text-center">
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.2)_0%,transparent_60%)] blur-[30px] pointer-events-none" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Your effective APY</p>
          <p className="text-[56px] font-extrabold text-accent-purple-bright mt-2 leading-none tabular-nums animate-count-pop">
            {effective.toFixed(2)}
            <span className="text-[24px] text-text-muted">%</span>
          </p>
          <p className="text-sm text-text-secondary mt-2">
            Baseline {baseline.toFixed(2)}% + bonus {myBonus.toFixed(2)}%
          </p>
        </div>
      </Card>

      {/* Breakdown — APY math */}
      <Card className="!p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-4">How your APY is built</p>
        <div className="flex flex-col gap-2">
          <Row label="Steakhouse Prime USDC (Morpho)" value={`${vaultRate.toFixed(2)}%`} muted />
          <Row label="Oria spread" value={`−${spread.toFixed(2)}%`} muted />
          <div className="h-px bg-oria my-1.5" />
          <Row label="Distributable" value={`${(vaultRate - spread).toFixed(2)}%`} muted />
          <Row label="Baseline (guaranteed)" value={`${baseline.toFixed(2)}%`} color="text-accent-purple-bright" />
          <Row label="Bonus pool available" value={`${poolRate.toFixed(2)}%`} muted />
          <div className="h-px bg-oria my-1.5" />
          <Row label="Your activity bonus" value={`+${myBonus.toFixed(2)}%`} color="text-success-500" bold />
          <Row label="Your total" value={`${effective.toFixed(2)}%`} color="text-accent-purple-bright" bold large />
        </div>
        <p className="text-[11px] text-text-muted mt-4 leading-relaxed">
          The bonus pool ({poolRate.toFixed(2)}%) is redistributed among all users based on activity score. Active users get more, inactive users get only the baseline.
        </p>
      </Card>

      {/* Score breakdown */}
      <Card className="!p-5">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Your activity score</p>
          <p className="text-[20px] font-extrabold text-accent-purple-bright tabular-nums leading-none">{score.toFixed(2)}</p>
        </div>
        <p className="text-[11px] text-text-muted mb-4">
          {relativeRatio > 1.1
            ? `You're ${(relativeRatio).toFixed(1)}× more active than the average user → bigger slice of the pool.`
            : relativeRatio < 0.9
              ? `You're below average (×${relativeRatio.toFixed(2)}). More activity unlocks more bonus.`
              : "You're around the average. Get more active to climb above."}
        </p>
        <div className="flex flex-col gap-3">
          {SCORE_BREAKDOWN.map((c) => {
            const val = scoreComponents[c.key];
            const pct = (val / c.weight) * 100;
            return (
              <div key={c.key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[13px] text-text-secondary">{c.label}</span>
                  <span className={`text-[12px] font-semibold tabular-nums ${val > 0 ? "text-text-primary" : "text-text-muted"}`}>
                    {val.toFixed(2)} / {c.weight.toFixed(2)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-oria-chip overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${val > 0 ? "bg-gradient-to-r from-accent-purple to-accent-purple-bright" : ""}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-text-muted mt-4">
          Score caps at 1.00 — max all 4 components for the strongest bonus slice.
        </p>
      </Card>

      {/* How to maximize */}
      <Card className="!p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">How to maximize your bonus</p>
        <div className="flex flex-col gap-3">
          <Tip
            color="purple"
            title="Build your streak"
            desc="Each week of consecutive goal completion raises your streak component up to the 16-week max."
          />
          <Tip
            color="green"
            title="Hit 3+ sessions per week"
            desc="Unlocks the regularity sub-score."
          />
          <Tip
            color="orange"
            title="Do your long session"
            desc={`Hit your configured long ${user?.goalType === "cycling" ? "ride" : "run"} of ${longRunTarget.toFixed(0)}+ km this week.`}
          />
          <Tip
            color="gold"
            title="Improve your pace"
            desc="Run faster than last month's average to unlock the progression component."
          />
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value, color, muted, bold, large }: {
  label: string; value: string; color?: string; muted?: boolean; bold?: boolean; large?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-[13px] ${muted ? "text-text-muted" : "text-text-secondary"}`}>{label}</span>
      <span className={`tabular-nums ${large ? "text-[18px]" : "text-[14px]"} ${bold ? "font-extrabold" : "font-semibold"} ${color ?? "text-text-primary"}`}>{value}</span>
    </div>
  );
}

function Tip({ color, title, desc }: { color: "purple" | "green" | "orange" | "gold"; title: string; desc: string }) {
  const bg = {
    purple: "bg-accent-purple/15 border-accent-purple/25",
    green: "bg-success-500/15 border-success-500/25",
    orange: "bg-accent-sport/15 border-accent-sport/25",
    gold: "bg-accent-gold/15 border-accent-gold/25",
  }[color];
  return (
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 rounded-lg ${bg} border flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <span className="w-2 h-2 rounded-full bg-current opacity-80" />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-text-primary">{title}</p>
        <p className="text-[12px] text-text-muted">{desc}</p>
      </div>
    </div>
  );
}
