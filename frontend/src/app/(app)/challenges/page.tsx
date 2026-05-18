"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { CardSkeleton, ErrorCard } from "@/components/Skeleton";
import { useChallenges, useCreateChallenge, useJoinChallenge, useDeleteChallenge, useUser } from "@/lib/hooks";
import { getInitials, daysUntil } from "@/lib/utils";
import { useToast } from "@/components/Toast";

export default function ChallengesPage() {
  const { data: challenges, isLoading, isError, refetch } = useChallenges();
  const { data: user } = useUser();
  const createChallenge = useCreateChallenge();
  const joinChallenge = useJoinChallenge();
  const deleteChallenge = useDeleteChallenge();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => setMounted(true), []);
  const [title, setTitle] = useState("");
  const [goalKm, setGoalKm] = useState("");
  const [duration, setDuration] = useState("4");
  const [maxMembers, setMaxMembers] = useState("");
  const [description, setDescription] = useState("");

  const resetForm = () => {
    setTitle("");
    setGoalKm("");
    setDuration("4");
    setMaxMembers("");
    setDescription("");
  };

  const myChallenges = challenges?.filter(
    (c) => !!user && c.members.some((m) => m.userId === user.id),
  ) ?? [];
  const otherChallenges = challenges?.filter(
    (c) => !user || !c.members.some((m) => m.userId === user.id),
  ) ?? [];

  const q = searchQuery.trim().toLowerCase();
  const filteredOtherChallenges = q
    ? otherChallenges.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false),
      )
    : otherChallenges;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="pt-1 pb-2">
          <div className="h-7 w-36 skeleton-shimmer rounded" />
        </div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        <div className="pt-1 pb-2">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Challenges</h1>
        </div>
        <ErrorCard onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="pt-1 pb-1">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Challenges</h1>
      </div>

      <button
        onClick={() => setShowCreate(true)}
        className="w-full p-4 rounded-2xl border border-dashed border-accent-purple/40 bg-accent-purple/8 text-accent-purple-bright font-semibold text-[15px] cursor-pointer hover:bg-accent-purple/12 transition-colors min-h-[44px] flex items-center justify-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Create challenge
      </button>

      {/* Create Challenge bottom-sheet */}
      {showCreate && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 backdrop-blur-sm"
          onClick={() => { setShowCreate(false); resetForm(); }}
        >
          <div
            className="w-full max-w-[420px] bg-[#0F0F16] rounded-t-3xl border-t border-x border-oria p-6 sheet-in max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-oria-strong mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-text-primary">New challenge</h3>
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                aria-label="Close"
                className="w-9 h-9 rounded-full bg-oria-chip border border-oria flex items-center justify-center cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA0AC" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer 10K"
              className="w-full px-4 py-3.5 rounded-2xl border border-oria bg-oria-section text-[15px] text-text-primary placeholder:text-text-muted focus:border-accent-purple outline-none mb-4"
            />

            <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Weekly goal (km)</label>
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              value={goalKm}
              onChange={(e) => setGoalKm(e.target.value)}
              placeholder="10"
              className="w-full px-4 py-3.5 rounded-2xl border border-oria bg-oria-section text-[15px] text-text-primary placeholder:text-text-muted focus:border-accent-purple outline-none mb-4 tabular-nums"
            />

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Duration (weeks)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  max="52"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-oria bg-oria-section text-[15px] text-text-primary focus:border-accent-purple outline-none tabular-nums"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Max members</label>
                <input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="2"
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value)}
                  placeholder="No limit"
                  className="w-full px-4 py-3.5 rounded-2xl border border-oria bg-oria-section text-[15px] text-text-primary placeholder:text-text-muted focus:border-accent-purple outline-none tabular-nums"
                />
              </div>
            </div>

            <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this challenge about?"
              rows={2}
              className="w-full px-4 py-3 rounded-2xl border border-oria bg-oria-section text-[15px] text-text-primary placeholder:text-text-muted focus:border-accent-purple outline-none mb-5 resize-none"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="flex-1 py-3.5 rounded-xl border border-oria bg-oria-chip text-text-secondary font-semibold text-sm min-h-[44px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!title || !goalKm || createChallenge.isPending}
                onClick={() => {
                  createChallenge.mutate(
                    {
                      title,
                      goalKmWeek: parseFloat(goalKm),
                      durationWeeks: parseInt(duration) || 4,
                      ...(maxMembers ? { maxMembers: parseInt(maxMembers) } : {}),
                      ...(description.trim() ? { description: description.trim() } : {}),
                    },
                    {
                      onSuccess: () => {
                        setShowCreate(false);
                        resetForm();
                        toast("Challenge created!");
                      },
                      onError: () => toast("Failed to create challenge", "error"),
                    },
                  );
                }}
                className="flex-1 py-3.5 rounded-xl gradient-brand text-white font-semibold text-sm shadow-button disabled:opacity-50 min-h-[44px]"
              >
                {createChallenge.isPending ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* My Challenges */}
      {myChallenges.length > 0 && (
        <>
          <p className="text-[13px] font-semibold text-text-secondary mt-2">My Challenges</p>
          {myChallenges.map((c) => {
            const memberCount = c._count.members;
            const myMembership = user ? c.members.find((m) => m.userId === user.id) : null;
            const myProgress = myMembership && myMembership.weeksTotal > 0
              ? myMembership.weeksMet / myMembership.weeksTotal
              : 0;
            const weeksLeft = Math.max(0, Math.ceil((new Date(c.endDate).getTime() - Date.now()) / (7 * 86400_000)));

            return (
              <Link key={c.id} href={`/challenges/${c.id}`} className="block">
                <Card className="!p-4 !border-accent-purple/20 cursor-pointer hover:bg-oria-card-hover transition-colors">
                <div className="flex justify-between items-start mb-2 gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-text-primary tracking-tight truncate">{c.title}</p>
                    <p className="text-[11px] text-text-muted mt-0.5 tabular-nums">
                      {c.goalKmWeek} km/week · {weeksLeft > 0 ? `${weeksLeft}w left` : "ended"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-success-100 border border-success-500/25 text-success-500 inline-flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Joined
                    </span>
                    {user && c.creatorId === user.id && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (window.confirm(`Delete "${c.title}"? This can't be undone.`)) {
                            deleteChallenge.mutate(c.id, {
                              onSuccess: () => toast("Challenge deleted"),
                              onError: () => toast("Failed to delete", "error"),
                            });
                          }
                        }}
                        aria-label="Delete challenge"
                        className="w-7 h-7 rounded-full bg-oria-chip border border-oria flex items-center justify-center cursor-pointer hover:bg-error-100 hover:border-error-500/25 transition-colors group"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA0AC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-error-500 transition-colors">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {c.description && (
                  <p className="text-[12px] text-text-muted mb-2.5 line-clamp-2">{c.description}</p>
                )}

                <div className="mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-text-muted">Your progress</span>
                    <span className="text-[11px] font-semibold text-accent-purple-bright tabular-nums">
                      {myMembership ? `${myMembership.weeksMet}/${myMembership.weeksTotal} weeks` : "0/0 weeks"}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-oria-chip overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent-purple to-accent-purple-bright transition-all duration-1000"
                      style={{ width: `${Math.round(myProgress * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex">
                    {c.members.slice(0, 4).map((m, i) => (
                      <div key={m.id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 4 - i }}>
                        <Avatar initials={getInitials(m.user.displayName)} size={28} src={m.user.avatarUrl} />
                      </div>
                    ))}
                    {memberCount > 4 && (
                      <div
                        className="w-7 h-7 rounded-full bg-oria-chip border border-oria flex items-center justify-center text-[10px] font-semibold text-text-secondary"
                        style={{ marginLeft: -8 }}
                      >
                        +{memberCount - 4}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-text-muted tabular-nums">{memberCount} member{memberCount !== 1 ? "s" : ""}</span>
                </div>
                </Card>
              </Link>
            );
          })}
        </>
      )}

      {/* All Challenges */}
      {otherChallenges.length > 0 && (
        <>
          <p className="text-[13px] font-semibold text-text-secondary mt-2">
            {myChallenges.length > 0 ? "Discover" : "Active Challenges"}
          </p>
          <div className="relative">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64697A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challenges…"
              className="w-full pl-10 pr-10 py-3 rounded-2xl border border-oria bg-oria-section text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent-purple outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-oria-chip border border-oria flex items-center justify-center cursor-pointer"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9CA0AC" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {filteredOtherChallenges.length === 0 && (
            <p className="text-[13px] text-text-muted text-center py-6">
              No challenges match &ldquo;{searchQuery}&rdquo;
            </p>
          )}
          {filteredOtherChallenges.map((c) => {
            const memberCount = c._count.members;
            const ends = daysUntil(c.endDate);
            const avgProgress =
              c.members.length > 0
                ? c.members.reduce((sum, m) => sum + (m.weeksTotal > 0 ? m.weeksMet / m.weeksTotal : 0), 0) / c.members.length
                : 0;

            return (
              <Link key={c.id} href={`/challenges/${c.id}`} className="block">
                <Card className="!p-4 cursor-pointer hover:bg-oria-card-hover transition-colors">
                <div className="flex justify-between items-start mb-2 gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-text-primary tracking-tight truncate">{c.title}</p>
                    <p className="text-[11px] text-text-muted mt-0.5 tabular-nums">
                      {c.goalKmWeek} km/week · ends in {ends}
                    </p>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-accent-purple/15 border border-accent-purple/25 text-[11px] text-accent-purple-bright font-semibold tabular-nums shrink-0">
                    {memberCount}/{c.maxMembers ?? "\u221e"}
                  </div>
                </div>

                {c.description && (
                  <p className="text-[12px] text-text-muted mb-2.5 line-clamp-2">{c.description}</p>
                )}

                <div className="h-1.5 rounded-full bg-oria-chip overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-purple to-accent-purple-bright transition-all duration-1000"
                    style={{ width: `${Math.round(avgProgress * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex">
                    {c.members.slice(0, 4).map((m, i) => (
                      <div key={m.id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 4 - i }}>
                        <Avatar initials={getInitials(m.user.displayName)} size={28} src={m.user.avatarUrl} />
                      </div>
                    ))}
                    {memberCount > 4 && (
                      <div
                        className="w-7 h-7 rounded-full bg-oria-chip border border-oria flex items-center justify-center text-[10px] font-semibold text-text-secondary"
                        style={{ marginLeft: -8 }}
                      >
                        +{memberCount - 4}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      joinChallenge.mutate(c.id, {
                        onSuccess: () => toast("Joined challenge!"),
                        onError: () => toast("Failed to join", "error"),
                      });
                    }}
                    disabled={joinChallenge.isPending}
                    className="text-[11px] font-semibold px-3.5 py-1.5 rounded-full gradient-brand text-white shadow-button min-h-[32px] disabled:opacity-50"
                  >
                    Join
                  </button>
                </div>
                </Card>
              </Link>
            );
          })}
        </>
      )}

      {/* Empty state */}
      {challenges && challenges.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-accent-purple/15 border border-accent-purple/25 flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4a2 2 0 000 4c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4a2 2 0 000-4h-2" />
                <path d="M6 3h12v6a6 6 0 01-12 0V3z" />
                <line x1="12" y1="17" x2="12" y2="21" /><line x1="9" y1="21" x2="15" y2="21" />
              </svg>
            </div>
            <p className="text-[14px] font-semibold text-text-primary mb-1">No active challenges yet</p>
            <p className="text-[12px] text-text-muted mb-3">Challenge your friends to run more and earn more together.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-[13px] text-accent-purple-bright font-semibold hover:text-accent-purple"
            >
              Create your first challenge →
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
