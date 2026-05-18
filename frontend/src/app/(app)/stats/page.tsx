"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { CardSkeleton } from "@/components/Skeleton";
import { useActivities, useStravaStatus } from "@/lib/hooks";
import { lastNWeeks, lastNMonths } from "@/lib/utils";

const WEEKS_WINDOW = 4;
const MONTHS_WINDOW = 4;

type Period = "weekly" | "monthly" | "all";

interface Bucket {
  label: string;
  short: string;
  distanceKm: number;
  active: boolean;
}

function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function bucketize(activities: { weekStart: string; distanceKm: number }[], period: Period): Bucket[] {
  if (period === "weekly") {
    // Always show the last N consecutive ISO weeks — including weeks the user
    // didn't log anything (distanceKm = 0). Oldest first to match bar order.
    const weeks = lastNWeeks(activities, WEEKS_WINDOW).slice().reverse();
    return weeks.map((w) => {
      const { week } = isoWeek(new Date(w.weekStart));
      return {
        label: `W${week}`,
        short: `W${week}`,
        distanceKm: w.distanceKm,
        active: w.distanceKm > 0,
      };
    });
  }

  if (period === "monthly") {
    // Last N consecutive calendar months (oldest first), 0-km months kept.
    const months = lastNMonths(activities, MONTHS_WINDOW);
    return months.map((m) => ({
      label: `${MONTHS[m.month]} ${String(m.year).slice(2)}`,
      short: MONTHS[m.month],
      distanceKm: m.distanceKm,
      active: m.distanceKm > 0,
    }));
  }

  // all-time: yearly aggregation
  const byYear = new Map<number, number>();
  for (const a of activities) {
    const y = new Date(a.weekStart).getFullYear();
    byYear.set(y, (byYear.get(y) ?? 0) + a.distanceKm);
  }
  return Array.from(byYear.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([y, km]) => ({
      label: String(y),
      short: String(y),
      distanceKm: km,
      active: km > 0,
    }));
}

function Bars({ buckets, color, activeOnly }: { buckets: Bucket[]; color: string; activeOnly?: boolean }) {
  const max = Math.max(1, ...buckets.map((b) => b.distanceKm));
  if (buckets.length === 0) {
    return (
      <div className="h-[120px] flex items-center justify-center text-text-muted text-[12px]">
        No data yet — log an activity to see it here
      </div>
    );
  }
  return (
    <div className="mt-3">
      <div className="flex items-end gap-1.5 h-[110px]">
        {buckets.map((b, i) => {
          const h = activeOnly
            ? (b.active ? 100 : 8)
            : Math.max(2, (b.distanceKm / max) * 100);
          return (
            <div
              key={i}
              className="flex-1 rounded-t-md transition-all min-w-0"
              style={{
                height: `${h}%`,
                background: b.active
                  ? `linear-gradient(180deg, ${color} 0%, ${color}88 100%)`
                  : "rgba(255,255,255,0.06)",
              }}
              title={`${b.label}: ${b.distanceKm.toFixed(1)} km`}
            />
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {buckets.map((b, i) => (
          <span
            key={i}
            className="flex-1 text-[9px] text-text-muted tabular-nums truncate text-center min-w-0"
          >
            {b.short}
          </span>
        ))}
      </div>
    </div>
  );
}

function PeriodTabs({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const tabs: { id: Period; label: string }[] = [
    { id: "weekly", label: "Weekly" },
    { id: "monthly", label: "Monthly" },
    { id: "all", label: "All time" },
  ];
  return (
    <div className="flex gap-1.5 p-1 rounded-2xl bg-oria-chip border border-oria">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-colors cursor-pointer ${
            value === t.id
              ? "gradient-brand text-white shadow-button"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function StatsPage() {
  const [period, setPeriod] = useState<Period>("weekly");
  const { data: activities, isLoading } = useActivities(52);
  const { data: stravaStatus } = useStravaStatus();

  const buckets = useMemo(
    () => (activities ? bucketize(activities, period) : []),
    [activities, period],
  );

  const totalDistance = buckets.reduce((sum, b) => sum + b.distanceKm, 0);
  const activeCount = buckets.filter((b) => b.active).length;
  const periodLabel = period === "weekly" ? "weeks" : period === "monthly" ? "months" : "years";

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="pt-1 pb-2">
          <div className="h-7 w-24 skeleton-shimmer rounded" />
        </div>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 pt-1 pb-1">
        <Link
          href="/dashboard"
          aria-label="Back"
          className="w-9 h-9 rounded-full bg-oria-chip border border-oria flex items-center justify-center cursor-pointer hover:bg-oria-card-hover transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA0AC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Stats</h1>
      </div>

      <PeriodTabs value={period} onChange={setPeriod} />

      {/* Distance */}
      <Card>
        <div className="flex items-baseline justify-between mb-1">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Distance</p>
          <p className="text-[11px] text-text-muted">{period === "all" ? "by year" : `last ${buckets.length} ${periodLabel}`}</p>
        </div>
        <p className="text-[26px] font-extrabold text-text-primary tabular-nums tracking-tight">
          {totalDistance.toFixed(1)} <span className="text-[14px] font-bold text-text-muted">km</span>
        </p>
        <Bars buckets={buckets} color="#A78BFA" />
      </Card>

      {/* Activities (proxy = active periods) */}
      <Card>
        <div className="flex items-baseline justify-between mb-1">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Active {periodLabel}
          </p>
          <p className="text-[11px] text-text-muted">
            {buckets.length > 0 ? `${activeCount}/${buckets.length}` : "—"}
          </p>
        </div>
        <p className="text-[26px] font-extrabold text-text-primary tabular-nums tracking-tight">
          {activeCount} <span className="text-[14px] font-bold text-text-muted">{periodLabel}</span>
        </p>
        <Bars buckets={buckets} color="#FC4C02" activeOnly />
      </Card>

      {/* Avg pace — placeholder until per-session data is available */}
      <Card>
        <div className="flex items-baseline justify-between mb-1">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Avg pace</p>
          <p className="text-[11px] text-text-muted">min / km</p>
        </div>
        <p className="text-[26px] font-extrabold text-text-muted tabular-nums tracking-tight">— : —</p>
        <div className="mt-3 p-3 rounded-xl bg-accent-purple/8 border border-accent-purple/20 flex items-start gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4l3 2" />
          </svg>
          <div className="min-w-0">
            <p className="text-[12px] text-text-primary font-semibold leading-snug">
              {stravaStatus?.connected ? "Pace data syncing soon" : "Connect Strava for pace data"}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
              {stravaStatus?.connected
                ? "We'll display avg pace once per-session details are aggregated."
                : "Manual weekly entries don't include pace. Connect Strava from your profile to track pace per run."}
            </p>
            {!stravaStatus?.connected && (
              <Link
                href="/profile"
                className="inline-block mt-2 text-[12px] font-semibold text-accent-purple-bright underline underline-offset-2"
              >
                Open profile →
              </Link>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
