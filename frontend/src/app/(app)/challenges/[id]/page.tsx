"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { CardSkeleton, ErrorCard } from "@/components/Skeleton";
import { useChallenge, useJoinChallenge, useUser, type ChallengeDetail } from "@/lib/hooks";
import { getInitials } from "@/lib/utils";
import { useToast } from "@/components/Toast";

function fmtWeek(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ChallengeDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const { data, isLoading, isError, refetch } = useChallenge(id);
  const { data: user } = useUser();
  const joinChallenge = useJoinChallenge();
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 pt-1 pb-2">
          <Link href="/challenges" className="w-9 h-9 rounded-xl bg-oria-card border border-oria flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <div className="h-7 w-40 skeleton-shimmer rounded" />
        </div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 pt-1 pb-2">
          <Link href="/challenges" className="w-9 h-9 rounded-xl bg-oria-card border border-oria flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Challenge</h1>
        </div>
        <ErrorCard onRetry={refetch} />
      </div>
    );
  }

  const c: ChallengeDetail = data;
  const isMember = !!user && c.members.some((m) => m.userId === user.id);
  const me = user ? c.members.find((m) => m.userId === user.id) : undefined;

  const weeksTotal = c.weeks.length;
  const totalRatio = c.aggregate.ratio;
  const weeksLeft = Math.max(0, Math.ceil((new Date(c.endDate).getTime() - Date.now()) / (7 * 86400_000)));

  const ranked = [...c.members].sort((a, b) => b.weeksMet - a.weeksMet);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1 pb-2">
        <Link
          href="/challenges"
          className="w-9 h-9 rounded-xl bg-oria-card border border-oria flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-text-primary tracking-tight truncate">{c.title}</h1>
          <p className="text-[11px] text-text-muted mt-0.5 tabular-nums">
            {c.goalKmWeek} km/week · {fmtDate(c.startDate)} → {fmtDate(c.endDate)}
          </p>
        </div>
      </div>

      {/* Hero — collective consistency */}
      <Card className="relative overflow-hidden !p-5 text-center">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[280px] h-[280px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.18)_0%,transparent_60%)] blur-[28px] pointer-events-none" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Collective consistency</p>
          <p className="text-[44px] font-extrabold text-accent-purple-bright mt-1 leading-none tabular-nums">
            {Math.round(totalRatio * 100)}<span className="text-[20px] text-text-muted">%</span>
          </p>
          <p className="text-[12px] text-text-secondary mt-1.5 tabular-nums">
            {c.aggregate.totalWeeksMet} / {c.aggregate.totalWeeksPossible} weeks met by the team
          </p>
          <div className="h-2 rounded-full bg-oria-chip overflow-hidden mt-3 mx-auto max-w-[280px]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-purple to-accent-purple-bright transition-all duration-1000"
              style={{ width: `${Math.round(totalRatio * 100)}%` }}
            />
          </div>
          <div className="flex justify-center gap-4 mt-4 text-[11px] text-text-muted">
            <span><span className="text-text-primary font-bold tabular-nums">{c.members.length}</span> members</span>
            <span aria-hidden>·</span>
            <span><span className="text-text-primary font-bold tabular-nums">{c.elapsedWeeks}/{weeksTotal}</span> weeks</span>
            <span aria-hidden>·</span>
            <span><span className="text-text-primary font-bold tabular-nums">{weeksLeft}</span>w left</span>
          </div>
        </div>
      </Card>

      {/* Action bar */}
      {!isMember && (
        <button
          onClick={() => joinChallenge.mutate(c.id, {
            onSuccess: () => toast("Joined challenge!"),
            onError: () => toast("Failed to join", "error"),
          })}
          disabled={joinChallenge.isPending || (!!c.maxMembers && c.members.length >= c.maxMembers)}
          className="w-full py-3.5 rounded-2xl gradient-brand text-white font-semibold text-[15px] shadow-button disabled:opacity-50 min-h-[48px]"
        >
          {joinChallenge.isPending ? "Joining…" : (c.maxMembers && c.members.length >= c.maxMembers ? "Full" : "Join challenge")}
        </button>
      )}

      {c.description && (
        <Card className="!p-4">
          <p className="text-[12px] text-text-secondary leading-relaxed">{c.description}</p>
        </Card>
      )}

      {/* Milestones timeline */}
      <Card className="!p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-4">Milestones</p>
        <div className="relative">
          {/* connecting line */}
          <div className="absolute left-3.5 top-3 bottom-3 w-px bg-oria" />
          <div className="flex flex-col gap-3.5">
            {c.milestones.map((m) => (
              <div key={m.key} className="flex items-start gap-3 relative">
                <div
                  className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 z-10 ${
                    m.achieved
                      ? "bg-gradient-to-br from-accent-purple to-accent-purple-bright border-accent-purple text-white shadow-button"
                      : "bg-oria-chip border-oria text-text-muted"
                  }`}
                >
                  {m.achieved ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className={`text-[13px] font-semibold ${m.achieved ? "text-text-primary" : "text-text-secondary"}`}>
                    {m.label}
                  </p>
                  {m.sub && (
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {m.sub}{m.at ? ` · ${fmtDate(m.at)}` : ""}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Per-week participation strip */}
      <Card className="!p-5">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Weekly participation</p>
          <p className="text-[10px] text-text-muted">% of members hitting the goal</p>
        </div>
        <div className="flex items-end gap-1 h-20 overflow-x-auto pb-1">
          {c.weeklyParticipation.map((w, i) => {
            const pct = Math.round(w.ratio * 100);
            const h = w.isPast ? Math.max(8, pct) : 4;
            const isCurrent = !w.isPast && i === c.elapsedWeeks;
            return (
              <div key={w.weekStart} className="flex flex-col items-center gap-1 shrink-0 min-w-[26px]">
                <span className="text-[9px] text-text-muted tabular-nums leading-none">
                  {w.isPast ? `${pct}%` : ""}
                </span>
                <div
                  className={`w-full rounded-md transition-all duration-700 ${
                    w.isPast
                      ? w.ratio >= 1
                        ? "bg-gradient-to-t from-accent-purple to-accent-purple-bright"
                        : w.ratio >= 0.5
                          ? "bg-gradient-to-t from-accent-purple/70 to-accent-purple-bright/80"
                          : w.ratio > 0
                            ? "bg-accent-purple/40"
                            : "bg-oria-chip"
                      : isCurrent
                        ? "bg-oria-strong border border-accent-purple/40"
                        : "bg-oria-chip"
                  }`}
                  style={{ height: `${h}%` }}
                />
                <span className="text-[9px] text-text-muted tabular-nums leading-none">{fmtWeek(w.weekStart)}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Consistency grid — heatmap rows=members, cols=weeks */}
      <Card className="!p-5">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Consistency grid</p>
          <div className="flex items-center gap-2 text-[10px] text-text-muted">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-br from-accent-purple to-accent-purple-bright" /> met
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-oria-chip border border-oria" /> missed
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Header — week labels */}
            <div className="flex gap-1 mb-1 pl-[112px]">
              {c.weeks.map((w) => (
                <div key={w} className="w-5 text-[8px] text-text-muted tabular-nums text-center">{fmtWeek(w)}</div>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              {ranked.map((m) => {
                const isMe = !!user && m.userId === user.id;
                return (
                  <div key={m.id} className="flex items-center gap-1">
                    <div className={`flex items-center gap-1.5 w-[108px] shrink-0 ${isMe ? "" : ""}`}>
                      <Avatar
                        initials={getInitials(m.user.displayName)}
                        size={20}
                        src={m.user.avatarUrl}
                      />
                      <span className={`text-[11px] truncate ${isMe ? "text-accent-purple-bright font-semibold" : "text-text-secondary"}`}>
                        {m.user.displayName ?? "—"}{isMe ? " (you)" : ""}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {m.weekly.map((w) => (
                        <div
                          key={w.weekStart}
                          title={`${m.user.displayName ?? "—"} · ${fmtWeek(w.weekStart)} · ${w.distanceKm.toFixed(1)} km`}
                          className={`w-5 h-5 rounded-md ${
                            !w.isPast
                              ? "bg-oria-chip/40 border border-dashed border-oria"
                              : w.goalMet
                                ? "bg-gradient-to-br from-accent-purple to-accent-purple-bright shadow-[0_0_8px_rgba(139,92,246,0.35)]"
                                : "bg-oria-chip border border-oria"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-text-muted tabular-nums ml-2 shrink-0">
                      {m.weeksMet}/{m.weeksElapsed > 0 ? m.weeksElapsed : weeksTotal}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Leaderboard */}
      <Card className="!p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">Leaderboard</p>
        <div className="flex flex-col">
          {ranked.map((m, idx) => {
            const isMe = !!user && m.userId === user.id;
            const ratio = m.weeksElapsed > 0 ? m.weeksMet / m.weeksElapsed : 0;
            return (
              <div
                key={m.id}
                className={`flex items-center gap-3 py-2.5 border-b border-oria last:border-b-0 ${isMe ? "bg-accent-purple/8 -mx-2 px-2 rounded-xl" : ""}`}
              >
                <span className="text-[12px] font-bold text-text-muted tabular-nums w-5 text-center">{idx + 1}</span>
                <Avatar
                  initials={getInitials(m.user.displayName)}
                  size={32}
                  src={m.user.avatarUrl}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-semibold truncate ${isMe ? "text-accent-purple-bright" : "text-text-primary"}`}>
                    {m.user.displayName ?? "—"}{isMe ? " (you)" : ""}
                  </p>
                  <div className="h-1 rounded-full bg-oria-chip overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent-purple to-accent-purple-bright transition-all duration-700"
                      style={{ width: `${Math.round(ratio * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-[12px] font-bold text-text-primary tabular-nums shrink-0">
                  {m.weeksMet}<span className="text-text-muted font-medium">/{weeksTotal}</span>
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* My status */}
      {me && (
        <Card className="!p-4 !border-accent-purple/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Your run</p>
              <p className="text-[14px] font-bold text-text-primary mt-0.5 tabular-nums">
                {me.weeksMet}/{me.weeksElapsed > 0 ? me.weeksElapsed : weeksTotal} weeks met
              </p>
            </div>
            <Link
              href="/dashboard"
              className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-accent-purple/15 border border-accent-purple/25 text-accent-purple-bright"
            >
              Log a run →
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
