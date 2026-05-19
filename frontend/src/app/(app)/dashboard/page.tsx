"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { PlanModal } from "@/components/PlanModal";
import { ReferFriendsModal } from "@/components/ReferFriendsModal";
import { Avatar } from "@/components/Avatar";
import { QuickAction } from "@/components/QuickAction";
import { ProgressRing } from "@/components/ProgressRing";
import { CardSkeleton, ErrorCard } from "@/components/Skeleton";
import { Celebration } from "@/components/Celebration";
import { RunWelcome } from "@/components/RunWelcome";
import {
  useUser, useStreak, useFeed, useEarnings,
  useStravaStatus, useStravaSync, useLastRun,
  useFriendsWeekly, useActivities, useLikeFeedEvent,
} from "@/lib/hooks";
import { ProgressChart } from "@/components/ProgressChart";
import { useToast } from "@/components/Toast";
import { timeAgo, getInitials, formatFeedEvent, formatMoney, lastNWeeks } from "@/lib/utils";

export default function DashboardPage() {
  const { data: user, isLoading: userLoading, isError: userError, refetch: refetchUser } = useUser();
  const { data: streak, isLoading: streakLoading, isError: streakError, refetch: refetchStreak } = useStreak();
  const { data: feed } = useFeed(15);
  const likeFeed = useLikeFeedEvent();
  const { data: earnings } = useEarnings();
  const { data: friendsWeekly } = useFriendsWeekly();
  const { data: activities } = useActivities(8);
  const { data: stravaStatus } = useStravaStatus();
  const stravaSync = useStravaSync();
  const { data: lastRunData } = useLastRun();
  const { toast } = useToast();

  const [showSyncCelebration, setShowSyncCelebration] = useState(false);
  const [syncedKm, setSyncedKm] = useState(0);
  const [showRunWelcome, setShowRunWelcome] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showReferModal, setShowReferModal] = useState(false);
  const welcomeChecked = useRef(false);
  const autoSynced = useRef(false);

  // Show celebration when there's new distance since last time we celebrated
  useEffect(() => {
    if (welcomeChecked.current || !streak) return;
    welcomeChecked.current = true;
    const currentKm = streak.currentWeek?.distanceKm ?? 0;
    if (currentKm <= 0) return;
    const stored = parseFloat(localStorage.getItem("oria_celebrated_km") ?? "0");
    if (currentKm > stored) {
      setShowRunWelcome(true);
      localStorage.setItem("oria_celebrated_km", String(currentKm));
    }
  }, [streak]);

  // Auto-sync Strava on dashboard load (once per session)
  useEffect(() => {
    if (stravaStatus?.connected && !autoSynced.current && !stravaSync.isPending) {
      autoSynced.current = true;
      stravaSync.mutate(undefined);
    }
  }, [stravaStatus?.connected]); // eslint-disable-line react-hooks/exhaustive-deps

  if (userLoading || streakLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="pt-1 pb-2">
          <div className="h-4 w-28 skeleton-shimmer rounded" />
          <div className="h-10 w-44 skeleton-shimmer rounded mt-2" />
        </div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (userError || streakError) {
    return (
      <div className="flex flex-col gap-4">
        <div className="pt-1 pb-2">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Home</h1>
        </div>
        <ErrorCard onRetry={() => { refetchUser(); refetchStreak(); }} />
      </div>
    );
  }

  const displayName = user?.displayName?.split(" ")[0] ?? "there";
  const streakCount = streak?.currentCount ?? 0;
  const apy = streak?.currentApy ?? 3.0;
  const effectiveApy = streak?.effectiveApy ?? apy;
  const targetKm = user?.targetKm ?? 10;
  const currentKm = streak?.currentWeek?.distanceKm ?? 0;
  const pct = Math.min(100, Math.round((currentKm / targetKm) * 100));
  const balance = (earnings?.totalDeposited ?? 0) + (earnings?.totalEarned ?? 0);
  const earned = earnings?.totalEarned ?? 0;
  const currency = user?.settings?.currency ?? "USD";
  const bal = formatMoney(balance, currency);
  const earnedFmt = formatMoney(earned, currency);
  const intWithCommas = bal.intPart;
  const decPartRaw = bal.decPart;


  const vacationUntil = streak?.vacationUntil ? new Date(streak.vacationUntil) : null;
  const vacationActive = !!vacationUntil && vacationUntil > new Date();
  const vacationDaysLeft = vacationUntil
    ? Math.max(0, Math.ceil((vacationUntil.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  return (
    <div className="flex flex-col gap-4">
      {vacationActive && (
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-accent-sport/10 border border-accent-sport/25 cursor-pointer hover:bg-accent-sport/15 transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-accent-sport animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-accent-sport">Vacation mode active</p>
            <p className="text-[11px] text-text-muted">
              Streak frozen — {vacationDaysLeft} day{vacationDaysLeft === 1 ? "" : "s"} left
            </p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FC4C02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      )}

      {/* Greeting + Balance Hero */}
      <section className="pt-2 pb-1">
        <p className="text-[16px] text-text-secondary font-medium">
          Hello, <span className="text-text-primary font-semibold">{displayName}</span>
        </p>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-[15px] text-text-muted font-medium mr-1">{bal.symbol}</span>
          <span className="text-[48px] font-extrabold text-text-primary leading-none tracking-tight tabular-nums">
            {intWithCommas}
          </span>
          <span className="text-[22px] text-text-muted font-bold tabular-nums">.{decPartRaw}</span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-[13px]">
          <span className="text-success-500 font-semibold tabular-nums">
            +{earnedFmt.symbol}{earnedFmt.intPart}.{earnedFmt.decPart}
          </span>
          <span className="text-text-muted">total earned</span>
          <Link href="/apy" className="ml-auto px-2.5 py-1 rounded-full bg-accent-purple/15 border border-accent-purple/25 text-accent-purple-bright text-[11px] font-semibold tabular-nums active:scale-95 transition-transform flex items-center gap-1">
            {effectiveApy.toFixed(2)}% APY
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </Link>
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-4 gap-2 py-2">
        <QuickAction
          label={stravaSync.isPending ? "Syncing…" : "Sync"}
          tint="sport"
          onClick={() => {
            if (stravaSync.isPending) return;
            if (!stravaStatus?.connected) {
              toast("Connect Strava from your profile first", "error");
              return;
            }
            stravaSync.mutate(undefined, {
              onSuccess: (d) => {
                if (d.synced > 0) {
                  setSyncedKm(d.lastRun?.distanceKm ?? 0);
                  setShowSyncCelebration(true);
                } else {
                  toast("Already up to date");
                }
              },
              onError: () => toast("Sync failed", "error"),
            });
          }}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={stravaSync.isPending ? "animate-spin" : ""}>
              <path d="M1 4v6h6" />
              <path d="M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
            </svg>
          }
        />
        <QuickAction
          label="Deposit"
          tint="gold"
          href="/wallet"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
        />
        <QuickAction
          label="Invite"
          tint="purple"
          onClick={() => setShowReferModal(true)}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M19 8v6M22 11h-6" />
            </svg>
          }
        />
        <QuickAction
          label="Stats"
          tint="neutral"
          href="/stats"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 14l4-4 3 3 5-6" />
            </svg>
          }
        />
      </section>

      {/* Coming soon — explore */}
      <section className="grid grid-cols-2 gap-2.5">
        {[
          {
            label: "Événements",
            description: "Run together with the community",
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            ),
          },
          {
            label: "Carte",
            description: "Discover Oria runners near you",
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
                <path d="M8 2v16M16 6v16" />
              </svg>
            ),
          },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => toast(`${item.label} — Coming soon`)}
            className="relative text-left p-4 rounded-2xl bg-oria-card border border-oria backdrop-blur-[18px] shadow-card cursor-pointer hover:bg-oria-card-hover transition-colors group min-h-[88px]"
          >
            <span className="absolute top-2.5 right-2.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-accent-purple/20 text-accent-purple-bright border border-accent-purple/25">
              Soon
            </span>
            <div className="w-9 h-9 rounded-xl bg-accent-purple/15 border border-accent-purple/25 flex items-center justify-center text-accent-purple-bright mb-2">
              {item.icon}
            </div>
            <p className="text-[13px] font-bold text-text-primary">{item.label}</p>
            <p className="text-[11px] text-text-muted mt-0.5 leading-snug line-clamp-2">{item.description}</p>
          </button>
        ))}
      </section>

      {/* Streak Hero */}
      <Link href="/streak" className="block">
        <Card className="relative overflow-hidden !p-5 cursor-pointer active:scale-[0.98] transition-transform">
          <div className="absolute -top-16 -right-10 w-[240px] h-[240px] rounded-full bg-[radial-gradient(circle,rgba(252,76,2,0.18)_0%,transparent_60%)] blur-[24px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-12 w-[200px] h-[200px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.18)_0%,transparent_60%)] blur-[24px] pointer-events-none" />
          <div className="flex items-center gap-4 relative">
            <div className="flex items-baseline gap-1.5 flex-shrink-0">
              <span
                className="text-[44px] leading-none drop-shadow-[0_2px_12px_rgba(252,76,2,0.45)]"
                aria-hidden
              >
                🔥
              </span>
              <span className="text-[56px] font-extrabold text-text-primary leading-none tracking-tight tabular-nums">
                {streakCount}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-sport">
                Current streak
              </p>
              <p className="text-[17px] font-bold text-text-primary mt-0.5">
                {streakCount === 0
                  ? "Start your streak this week"
                  : `${streakCount} week${streakCount > 1 ? "s" : ""} strong`}
              </p>
              <p className="text-[12px] text-text-secondary mt-0.5">
                {streakCount >= 16
                  ? `Max base APY — ${effectiveApy > 8 ? `${effectiveApy.toFixed(2)}% with bonuses` : "8.00%"}`
                  : `${(8 - apy).toFixed(2)}% to unlock max base APY`}
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted flex-shrink-0"><path d="M9 18l6-6-6-6" /></svg>
          </div>
        </Card>
      </Link>

      {/* This week progress */}
      <Card className="!p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              This week
            </p>
            <p className="text-[24px] font-extrabold text-text-primary mt-1 tabular-nums leading-none">
              {currentKm.toFixed(1)}
              <span className="text-[14px] text-text-secondary font-medium"> / {targetKm} km</span>
            </p>
          </div>
          <ProgressRing percent={pct} />
        </div>
        <div className="h-1.5 rounded-full bg-oria-chip overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-sport to-accent-gold animate-bar"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-3">
          <span className="text-[12px] text-text-muted">
            {Math.max(0, targetKm - currentKm).toFixed(1)} km remaining
            {stravaStatus?.connected && (
              <span className="text-accent-sport ml-1">· via Strava</span>
            )}
          </span>
          {stravaStatus?.connected && (
            <button
              onClick={() =>
                stravaSync.mutate(undefined, {
                  onSuccess: (d) => {
                    if (d.synced > 0 && d.lastRun) {
                      setSyncedKm(d.lastRun.distanceKm);
                      setShowSyncCelebration(true);
                    } else {
                      toast(`Synced ${d.synced} weeks from Strava`);
                    }
                  },
                  onError: () => toast("Sync failed", "error"),
                })
              }
              disabled={stravaSync.isPending}
              className="text-[11px] font-semibold text-accent-purple-bright cursor-pointer bg-accent-purple/15 border border-accent-purple/25 px-3 py-1.5 rounded-full min-h-[32px] flex items-center gap-1.5 disabled:opacity-50"
            >
              {stravaSync.isPending ? (
                <span className="inline-block w-3 h-3 border-2 border-accent-purple-bright/30 border-t-accent-purple-bright rounded-full animate-spin" />
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 4v6h6" /><path d="M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                </svg>
              )}
              Sync
            </button>
          )}
        </div>
        <Link href="/activities" className="flex items-center justify-center gap-1 mt-3 pt-2 border-t border-oria text-[12px] text-accent-purple-bright font-semibold">
          View all activities
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </Link>
      </Card>

      {/* Progress chart — last 8 consecutive weeks (0-km weeks included) */}
      {activities && (() => {
        const padded = lastNWeeks(activities, 8);
        const hasAnyData = padded.some((w) => w.distanceKm > 0);
        if (!hasAnyData) return null;
        return (
          <Card className="!p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">
              Weekly progress
            </p>
            <ProgressChart data={padded} targetKm={targetKm} />
          </Card>
        );
      })()}

      {/* Last run */}
      {lastRunData?.lastRun && (
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-accent-sport/15 border border-accent-sport/25 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#FC4C02">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-.956l2.09 4.128L3 0h4.138" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Last activity
              </p>
              <p className="text-[14px] font-semibold text-text-primary truncate">{lastRunData.lastRun.name}</p>
              <p className="text-[11px] text-text-muted">{new Date(lastRunData.lastRun.date).toLocaleDateString()}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[20px] font-extrabold text-text-primary tabular-nums leading-none">
                {lastRunData.lastRun.distanceKm}<span className="text-[12px] text-text-muted font-medium"> km</span>
              </p>
              <p className="text-[11px] text-text-muted tabular-nums mt-0.5">
                {Math.floor(lastRunData.lastRun.movingTimeSec / 60)} min
                {lastRunData.lastRun.distanceKm > 0 && (() => {
                  const paceMin = lastRunData.lastRun.movingTimeSec / 60 / lastRunData.lastRun.distanceKm;
                  const m = Math.floor(paceMin);
                  const s = Math.round((paceMin - m) * 60);
                  return <> · <span className="text-text-secondary font-semibold">{m}:{String(s).padStart(2, "0")}</span><span className="text-text-muted"> /km</span></>;
                })()}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Weekly consistency — you + friends */}
      {friendsWeekly && friendsWeekly.length > 0 && (
        <Card className="!p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-text-primary tracking-tight">Weekly consistency</p>
            <Link href="/social" className="text-[12px] text-accent-purple-bright font-semibold hover:text-accent-purple">
              See all →
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {friendsWeekly.slice(0, 5).map((f) => {
              const pctF = Math.min(100, Math.round((f.distanceKm / f.targetKm) * 100));
              return (
                <div key={f.id} className={`rounded-xl ${f.isMe ? "bg-accent-purple/8 border border-accent-purple/15 p-2.5" : "p-0.5"}`}>
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={getInitials(f.displayName)} size={28} highlight={f.isMe} src={f.avatarUrl} />
                    <span className="text-[13px] font-semibold text-text-primary flex-1 truncate">
                      {f.isMe ? "You" : (f.displayName ?? "User")}
                    </span>
                    <span className="text-[12px] font-bold tabular-nums text-text-primary">
                      {f.distanceKm.toFixed(1)}
                      <span className="text-text-muted font-medium">/{f.targetKm}</span>
                    </span>
                    {f.goalMet ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      <span className="text-[11px] font-semibold text-text-muted tabular-nums w-[14px] text-center">
                        {pctF}%
                      </span>
                    )}
                  </div>
                  <div className="h-1 rounded-full bg-oria-chip overflow-hidden mt-1.5">
                    <div
                      className={`h-full rounded-full animate-bar ${f.goalMet ? "bg-success-500" : "bg-gradient-to-r from-accent-sport to-accent-gold"}`}
                      style={{ width: `${pctF}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Coaching plan */}
      {(() => {
        const goalType = user?.goalType ?? "running";
        const isSteps = goalType === "steps";
        const isCycling = goalType === "cycling";
        const sessionWord = isSteps ? "day" : isCycling ? "ride" : "run";
        const unitLabel = isSteps ? "k steps" : "km";
        // Sessions/week: prefer the user's configured plan, fallback to runSchedule, then default.
        const plan = user?.settings?.runPlan;
        const scheduledDays = user?.runSchedule?.length ?? 0;
        const sessionsPerWeek = plan?.sessionsPerWeek ?? (scheduledDays > 0
          ? scheduledDays
          : Math.max(3, Math.min(5, Math.ceil(targetKm / 3))));
        const longRunKm = plan?.longRunKm ?? 0;
        const progressionPct = user?.settings?.monthlyProgressionPct ?? 10;
        const nextMonthTarget = Math.round(targetKm * (1 + progressionPct / 100) * 10) / 10;
        const weekSessions = streak?.weekSessions ?? 0;

        return (
          <>
            {/* Weekly plan + projection — same-height grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Plan — opens config modal */}
              <button
                onClick={() => setShowPlanModal(true)}
                className="block text-left bg-oria-card rounded-xl border border-oria backdrop-blur-[18px] shadow-card hover:bg-oria-card-hover transition-colors cursor-pointer p-4 h-full flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-accent-purple-bright">Plan</p>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64697A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
                <p className="text-[20px] font-extrabold text-text-primary mt-1 leading-none tabular-nums">
                  <span className="animate-count-pop inline-block">{weekSessions}</span>
                  <span className="text-[12px] text-text-muted font-semibold">/{sessionsPerWeek}</span>
                </p>
                <p className="text-[11px] text-text-secondary mt-1.5">
                  {sessionWord}{sessionsPerWeek > 1 ? "s" : ""} this week
                </p>
                <div className="mt-2 flex gap-1">
                  {Array.from({ length: sessionsPerWeek }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${i < weekSessions ? "bg-accent-sport animate-bar" : "bg-oria-chip"}`}
                      style={i < weekSessions ? { animationDelay: `${i * 0.1}s` } : undefined}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-text-muted mt-auto pt-2">
                  {plan
                    ? (longRunKm > 0 ? `1 long ${sessionWord}: ${longRunKm} ${unitLabel}` : "Tap to edit")
                    : "Tap to configure"}
                </p>
              </button>

              {/* Next month projection */}
              <Link href="/settings" className="block h-full">
                <Card className="!p-4 cursor-pointer hover:bg-oria-card-hover transition-colors h-full flex flex-col">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-accent-gold">Next month</p>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64697A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                  <p className="text-[20px] font-extrabold text-text-primary mt-1 leading-none tabular-nums">
                    {nextMonthTarget}<span className="text-[12px] text-text-muted font-semibold"> {unitLabel}/wk</span>
                  </p>
                  <p className="text-[11px] text-text-secondary mt-1.5">
                    {progressionPct === 0 ? "Maintenance" : `+${progressionPct}% overload`}
                  </p>
                  <p className="text-[10px] text-text-muted mt-auto pt-2">Tap to change rate</p>
                </Card>
              </Link>
            </div>
          </>
        );
      })()}

      {/* Plan config modal */}
      <PlanModal
        open={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        targetKm={targetKm}
        goalType={user?.goalType ?? "running"}
        initial={{
          sessionsPerWeek: user?.settings?.runPlan?.sessionsPerWeek ?? Math.max(3, Math.min(5, Math.ceil(targetKm / 3))),
          longRunKm: user?.settings?.runPlan?.longRunKm ?? 0,
        }}
        onSaved={() => refetchUser()}
      />

      {/* Refer friends modal */}
      <ReferFriendsModal
        open={showReferModal}
        onClose={() => setShowReferModal(false)}
        userId={user?.id}
        displayName={user?.displayName}
      />

      {/* Strava sync celebration */}
      <Celebration
        show={showSyncCelebration}
        onDone={() => setShowSyncCelebration(false)}
        streakCount={streakCount}
        distanceKm={syncedKm}
        goalMet={currentKm + syncedKm >= targetKm}
      />

      {/* Activity feed — friends' recent events + reactions (moved from /social) */}
      {(() => {
        const events = (feed ?? []).slice(0, 10);
        const ACCENT: Record<string, { bg: string; ring: string }> = {
          streak_milestone: { bg: "bg-accent-gold/15", ring: "ring-accent-gold/30" },
          goal_met: { bg: "bg-success-500/15", ring: "ring-success-500/30" },
          challenge_completed: { bg: "bg-accent-purple/15", ring: "ring-accent-purple/30" },
          challenge_joined: { bg: "bg-accent-purple/10", ring: "" },
          deposit: { bg: "bg-accent-gold/10", ring: "" },
          streak_lost: { bg: "bg-error-500/10", ring: "" },
        };
        return (
          <Card className="!p-5">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-sm font-bold text-text-primary tracking-tight">Activity feed</p>
                <p className="text-[11px] text-text-muted mt-0.5">React to keep the energy alive</p>
              </div>
              <Link href="/social" className="text-[12px] text-accent-purple-bright font-semibold hover:text-accent-purple">
                Friends →
              </Link>
            </div>
            {events.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {events.map((f) => {
                  const { text, emoji } = formatFeedEvent(f.eventType, f.payload as Record<string, unknown>);
                  const liked = !!user?.id && f.likedBy.includes(user.id);
                  const isMine = user?.id === f.userId;
                  const accent = ACCENT[f.eventType] ?? { bg: "bg-oria-section", ring: "" };
                  const streakCount = f.user.streakCount ?? 0;
                  const isHotStreak = streakCount >= 5;
                  return (
                    <div
                      key={f.id}
                      className={`flex items-start gap-3 p-3 rounded-2xl ${accent.bg} ${accent.ring ? `ring-1 ${accent.ring}` : ""} border border-oria`}
                    >
                      <div className="relative shrink-0">
                        <Avatar initials={getInitials(f.user.displayName)} size={40} src={f.user.avatarUrl} />
                        {streakCount > 0 && (
                          <div
                            className={`absolute -bottom-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full flex items-center justify-center gap-0.5 border-2 border-[#07070B] shadow-button ${
                              isHotStreak
                                ? "bg-gradient-to-br from-accent-sport to-accent-gold"
                                : "bg-gradient-to-br from-accent-purple to-accent-purple-bright"
                            }`}
                            title={`${streakCount}-week streak`}
                          >
                            <span className="text-[10px]" aria-hidden>{isHotStreak ? "🔥" : "✦"}</span>
                            <span className="text-[10px] font-extrabold text-white tabular-nums leading-none">{streakCount}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-text-primary leading-snug">
                          <span className="font-semibold">{isMine ? "You" : (f.user.displayName ?? "User")}</span>{" "}
                          <span className="text-text-secondary">{text}</span>
                          <span className="ml-1">{emoji}</span>
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5 flex items-center gap-2">
                          <span>{timeAgo(f.createdAt)}</span>
                          {streakCount > 0 && (
                            <span className={`tabular-nums font-semibold ${isHotStreak ? "text-accent-sport" : "text-accent-purple-bright"}`}>
                              · {streakCount}w streak
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (isMine) return;
                          likeFeed.mutate(f.id);
                        }}
                        disabled={isMine || likeFeed.isPending}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[11px] font-semibold tabular-nums shrink-0 transition-colors cursor-pointer disabled:cursor-default ${
                          liked
                            ? "bg-accent-sport/15 border-accent-sport/30 text-accent-sport"
                            : "bg-oria-chip border-oria text-text-secondary hover:text-text-primary hover:bg-oria-elevated"
                        } ${isMine ? "opacity-60" : ""}`}
                        aria-label={liked ? "Unlike" : "Cheer"}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                        </svg>
                        {f.likes > 0 && <span>{f.likes}</span>}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 px-4">
                <div className="w-12 h-12 rounded-full bg-oria-chip border border-oria flex items-center justify-center mb-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA0AC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 11l-3 3-3-3M19 14V4" />
                  </svg>
                </div>
                <p className="text-[13px] text-text-secondary text-center">Nothing in the feed yet.</p>
                <Link href="/social" className="text-[11px] text-accent-purple-bright font-semibold mt-1">
                  Invite friends →
                </Link>
              </div>
            )}
          </Card>
        );
      })()}

      {/* Run welcome celebration — shows on app open if new km */}
      {showRunWelcome && (
        <RunWelcome
          distanceKm={currentKm}
          targetKm={targetKm}
          streakCount={streakCount}
          goalMet={currentKm >= targetKm}
          onDone={() => setShowRunWelcome(false)}
        />
      )}
    </div>
  );
}
