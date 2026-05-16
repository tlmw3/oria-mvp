"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useUserProfile } from "@/lib/hooks";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { CardSkeleton } from "@/components/Skeleton";
import { getInitials } from "@/lib/utils";

function formatWeekLabel(weekStart: string) {
  const d = new Date(weekStart);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function goalTypeLabel(goalType: string) {
  const map: Record<string, string> = {
    running: "Running",
    cycling: "Cycling",
    steps: "Steps",
  };
  return map[goalType] ?? goalType;
}

function goalTypeUnit(goalType: string) {
  return goalType === "steps" ? "k steps" : "km";
}

export default function FriendProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const { data: profile, isLoading, isError } = useUserProfile(userId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="pt-1 pb-2 flex items-center gap-3">
          <Link
            href="/social"
            className="w-11 h-11 rounded-xl bg-oria-chip border border-oria flex items-center justify-center flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA0AC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="h-7 w-32 skeleton-shimmer rounded" />
        </div>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex flex-col gap-4">
        <div className="pt-1 pb-2 flex items-center gap-3">
          <Link
            href="/social"
            className="w-11 h-11 rounded-xl bg-oria-chip border border-oria flex items-center justify-center flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA0AC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Profile</h1>
        </div>
        <Card>
          <div className="text-center py-8">
            <p className="text-text-secondary text-[15px] font-medium">Could not load this profile.</p>
            <Link href="/social" className="text-accent-purple-bright text-[13px] font-semibold mt-2 inline-block">
              Back to Social
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const consistency =
    profile.stats.weeksActive > 0
      ? Math.round((profile.stats.goalMetWeeks / profile.stats.weeksActive) * 100)
      : 0;

  const unit = goalTypeUnit(profile.goalType);
  const maxDistance = Math.max(profile.targetKm, ...profile.activities.map((a) => a.distanceKm));

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="pt-1 pb-1 flex items-center gap-3">
        <Link
          href="/social"
          className="w-11 h-11 rounded-xl bg-oria-chip border border-oria flex items-center justify-center flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA0AC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Profile</h1>
      </div>

      {/* Avatar + Name + Goal */}
      <div className="flex flex-col items-center py-4">
        <div className="mb-3">
          <Avatar initials={getInitials(profile.displayName)} size={84} highlight src={profile.avatarUrl ?? null} />
        </div>
        <p className="text-lg font-bold text-text-primary">
          {profile.displayName || "Anonymous"}
        </p>
        <p className="text-[13px] text-text-secondary mt-0.5">
          {goalTypeLabel(profile.goalType)} &middot; {profile.targetKm} {unit}/week
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="!p-3.5 text-center">
          <p className="text-xl font-extrabold text-text-primary tabular-nums">
            {profile.stats.totalKm.toFixed(1)}
          </p>
          <p className="text-[11px] text-text-muted font-medium mt-0.5">Total {unit}</p>
        </Card>
        <Card className="!p-3.5 text-center">
          <p className="text-xl font-extrabold text-text-primary tabular-nums">
            {profile.stats.weeksActive}
          </p>
          <p className="text-[11px] text-text-muted font-medium mt-0.5">Weeks active</p>
        </Card>
        <Card className="!p-3.5 text-center">
          <p className="text-xl font-extrabold text-text-primary tabular-nums">
            {consistency}%
          </p>
          <p className="text-[11px] text-text-muted font-medium mt-0.5">Consistency</p>
        </Card>
      </div>

      {/* Streak Card */}
      {profile.streak && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-accent-gold/15 border border-accent-gold/25 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#F59E0B" stroke="none">
                  <path d="M12 2c.5 3.5 3 6 5 8 2.5 2.5 3 5.5 1 8s-5.5 3-8 1.5c-2.5 1.5-6 1-8-1.5s-1.5-5.5 1-8c2-2 4.5-4.5 5-8 .5 3 2.5 5 4 5.5z" />
                </svg>
              </div>
              <div>
                <p className="text-[15px] font-bold text-text-primary">
                  {profile.streak.currentCount}-week streak
                </p>
                <p className="text-[12px] text-text-muted">
                  Best: {profile.streak.longestCount} weeks
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[15px] font-extrabold text-accent-purple-bright tabular-nums">
                {profile.streak.effectiveApy.toFixed(2)}%
              </p>
              <p className="text-[11px] text-text-muted">APY</p>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3 block">
          Recent activity
        </label>
        {profile.activities.length === 0 ? (
          <p className="text-[13px] text-text-muted py-4 text-center">No activity yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {profile.activities.map((week) => {
              const pct = maxDistance > 0 ? Math.min(100, (week.distanceKm / maxDistance) * 100) : 0;
              return (
                <div key={week.weekStart} className="flex items-center gap-3">
                  <p className="text-[11px] text-text-muted font-medium w-14 flex-shrink-0 tabular-nums">
                    {formatWeekLabel(week.weekStart)}
                  </p>
                  <div className="flex-1 h-6 rounded-lg bg-[rgba(255,255,255,0.04)] overflow-hidden relative">
                    <div
                      className={`h-full rounded-lg transition-all ${
                        week.goalMet
                          ? "bg-success-500/70"
                          : "bg-accent-sport/60"
                      }`}
                      style={{ width: `${Math.max(pct, 3)}%` }}
                    />
                  </div>
                  <p
                    className={`text-[12px] font-semibold w-12 text-right flex-shrink-0 tabular-nums ${
                      week.goalMet ? "text-success-500" : "text-accent-sport"
                    }`}
                  >
                    {week.distanceKm.toFixed(1)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
