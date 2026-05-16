"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { CardSkeleton, ErrorCard } from "@/components/Skeleton";
import {
  useLeaderboard,
  useFeed,
  useDiscoverUsers,
  useSearchUsers,
  useSendFriendRequest,
  useSentRequests,
  useCancelFriendRequest,
  usePendingRequests,
  useAcceptFriendRequest,
  useRejectFriendRequest,
  useFriends,
  useRemoveFriend,
  usePokeFriend,
  useLikeFeedEvent,
} from "@/lib/hooks";
import { useToast } from "@/components/Toast";
import { timeAgo, getInitials, formatFeedEvent } from "@/lib/utils";

function PodiumRow({
  rank,
  name,
  streak,
  apy,
  isMe,
  initials,
  avatarUrl,
}: {
  rank: number;
  name: string;
  streak: number;
  apy: number;
  isMe: boolean;
  initials: string;
  avatarUrl?: string | null;
}) {
  const medalFill = rank === 1 ? "#F59E0B" : rank === 2 ? "#94A3B8" : rank === 3 ? "#CD7F32" : null;
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-2xl ${
        isMe ? "bg-accent-purple/12 border border-accent-purple/25" : ""
      }`}
    >
      {medalFill ? (
        <span className="inline-flex items-center justify-center w-6 h-6" aria-label={`#${rank}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={medalFill} stroke="rgba(0,0,0,0.3)" strokeWidth="0.8">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
          </svg>
        </span>
      ) : (
        <span className="text-[13px] font-bold w-6 text-center tabular-nums text-text-muted">#{rank}</span>
      )}
      <Avatar initials={initials} size={34} highlight={isMe} src={avatarUrl ?? null} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-text-primary truncate">
          {name}{" "}
          {isMe && <span className="text-[11px] text-accent-purple-bright font-semibold">· you</span>}
        </p>
        <p className="text-[11px] text-text-muted tabular-nums">{apy.toFixed(2)}% APY</p>
      </div>
      <div className="text-right">
        <span className="text-[15px] font-extrabold text-accent-sport tabular-nums inline-flex items-center gap-1">
          {streak}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14a8 8 0 0016 0C20 9.9 18.02 6.24 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
          </svg>
        </span>
      </div>
    </div>
  );
}

type RelationStatus = "friend" | "sent" | "received" | null;

function getRelationStatus(
  userId: string,
  friendIds: Set<string>,
  sentIds: Set<string>,
  pendingIds: Set<string>,
): RelationStatus {
  if (friendIds.has(userId)) return "friend";
  if (sentIds.has(userId)) return "sent";
  if (pendingIds.has(userId)) return "received";
  return null;
}

function UserActionButton({
  userId,
  displayName,
  status,
  onSend,
  isSending,
}: {
  userId: string;
  displayName: string;
  status: RelationStatus;
  onSend: (id: string, name: string) => void;
  isSending: boolean;
}) {
  if (status === "friend") {
    return (
      <span className="text-[11px] font-semibold px-3.5 py-1.5 rounded-full bg-success-500/15 border border-success-500/25 text-success-500 min-h-[32px] flex items-center">
        Friends
      </span>
    );
  }
  if (status === "sent") {
    return (
      <span className="text-[11px] font-semibold px-3.5 py-1.5 rounded-full bg-oria-chip border border-oria text-text-muted min-h-[32px] flex items-center">
        Pending
      </span>
    );
  }
  if (status === "received") {
    return (
      <span className="text-[11px] font-semibold px-3.5 py-1.5 rounded-full bg-accent-gold/15 border border-accent-gold/25 text-accent-gold min-h-[32px] flex items-center">
        Respond
      </span>
    );
  }
  return (
    <button
      onClick={() => onSend(userId, displayName)}
      disabled={isSending}
      className="text-[11px] font-semibold px-3.5 py-1.5 rounded-full gradient-brand text-white shadow-button min-h-[32px] cursor-pointer disabled:opacity-50"
    >
      Add
    </button>
  );
}

export default function SocialPage() {
  const { data: board, isLoading: boardLoading, isError: boardError, refetch: refetchBoard } = useLeaderboard();
  const { data: feed, isLoading: feedLoading, isError: feedError, refetch: refetchFeed } = useFeed();
  const { data: discoverUsers } = useDiscoverUsers();
  const { data: friends } = useFriends();
  const { data: sentRequests } = useSentRequests();
  const { data: pendingRequests } = usePendingRequests();
  const sendRequest = useSendFriendRequest();
  const cancelRequest = useCancelFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const rejectRequest = useRejectFriendRequest();
  const removeFriend = useRemoveFriend();
  const pokeFriend = usePokeFriend();
  const likeFeed = useLikeFeedEvent();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data: searchResults, isFetching: searchFetching } = useSearchUsers(debouncedQuery);

  // Build sets for O(1) status lookups
  const friendIds = useMemo(() => new Set((friends ?? []).map((f) => f.user.id)), [friends]);
  const sentIds = useMemo(() => new Set((sentRequests ?? []).map((r) => r.user.id)), [sentRequests]);
  const pendingIds = useMemo(() => new Set((pendingRequests ?? []).map((r) => r.user.id)), [pendingRequests]);

  const getStatus = (userId: string) => getRelationStatus(userId, friendIds, sentIds, pendingIds);

  const handleSend = (userId: string, displayName: string) => {
    sendRequest.mutate(userId, {
      onSuccess: () => toast(`Request sent to ${displayName}`),
      onError: () => toast("Already sent or already friends", "error"),
    });
  };

  if (boardLoading || feedLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="pt-1 pb-2">
          <div className="h-7 w-28 skeleton-shimmer rounded" />
        </div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (boardError || feedError) {
    return (
      <div className="flex flex-col gap-4">
        <div className="pt-1 pb-2">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Friends</h1>
        </div>
        <ErrorCard onRetry={() => { refetchBoard(); refetchFeed(); }} />
      </div>
    );
  }

  const isSearching = debouncedQuery.length >= 2;
  const sortedBoard = board ?? [];
  const pendingCount = pendingRequests?.length ?? 0;
  const sentCount = sentRequests?.length ?? 0;
  const friendCount = friends?.length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="pt-1 pb-1">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Friends</h1>
      </div>

      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          aria-label="Search friends"
          className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-oria-section border border-oria text-[15px] text-text-primary placeholder:text-text-muted focus:border-accent-purple outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-oria-chip border border-oria flex items-center justify-center cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA0AC" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search results OR default view */}
      {isSearching ? (
        <Card className="!p-3">
          {searchFetching && !searchResults ? (
            <p className="text-[13px] text-text-muted py-6 text-center">Searching…</p>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="flex flex-col gap-1">
              {searchResults.map((u) => {
                const status = getStatus(u.id);
                return (
                  <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-oria-chip transition-colors">
                    <Avatar initials={getInitials(u.displayName ?? "?")} size={38} src={u.avatarUrl} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-text-primary truncate">{u.displayName ?? "User"}</p>
                      <p className="text-[11px] text-text-muted tabular-nums">
                        {u.streak ? `${u.streak.currentCount}w streak · ${u.streak.currentApy.toFixed(1)}% APY` : "New user"}
                      </p>
                    </div>
                    <UserActionButton
                      userId={u.id}
                      displayName={u.displayName ?? "user"}
                      status={status}
                      onSend={handleSend}
                      isSending={sendRequest.isPending}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px] text-text-muted py-6 text-center">
              No users found for &ldquo;{debouncedQuery}&rdquo;
            </p>
          )}
        </Card>
      ) : (
        <>
          {/* Friend requests — always visible */}
          <Card>
            <p className="text-base font-bold text-text-primary mb-3 tracking-tight">
              Friend requests
              {pendingCount > 0 && (
                <span className="ml-2 text-[12px] font-semibold text-accent-purple-bright bg-accent-purple/15 px-2 py-0.5 rounded-full">{pendingCount}</span>
              )}
            </p>

            {/* Received */}
            {pendingCount > 0 ? (
              <div className="flex flex-col gap-1">
                {pendingRequests!.map((r) => (
                  <div key={r.friendshipId} className="flex items-center gap-3 p-2.5 rounded-xl bg-accent-purple/5 border border-accent-purple/10">
                    <Avatar initials={getInitials(r.user.displayName ?? "?")} size={36} src={r.user.avatarUrl} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-text-primary truncate">{r.user.displayName ?? "User"}</p>
                      <p className="text-[11px] text-text-muted tabular-nums">
                        {r.user.streak ? `${r.user.streak.currentCount}w streak` : "New user"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          acceptRequest.mutate(r.friendshipId, {
                            onSuccess: () => toast(`${r.user.displayName ?? "User"} added`),
                            onError: () => toast("Failed to accept", "error"),
                          })
                        }
                        disabled={acceptRequest.isPending}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-full gradient-brand text-white shadow-button min-h-[32px] cursor-pointer disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() =>
                          rejectRequest.mutate(r.friendshipId, {
                            onSuccess: () => toast("Request declined"),
                            onError: () => toast("Failed to decline", "error"),
                          })
                        }
                        disabled={rejectRequest.isPending}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-oria-chip border border-oria text-text-muted min-h-[32px] cursor-pointer disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-xl bg-accent-purple/10 border border-accent-purple/15 flex items-center justify-center mx-auto mb-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M19 8v6M22 11h-6" />
                  </svg>
                </div>
                <p className="text-[12px] text-text-muted">No pending requests</p>
              </div>
            )}

            {/* Sent requests inline */}
            {sentCount > 0 && (
              <div className="mt-4 pt-3 border-t border-oria">
                <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Sent
                  <span className="ml-1.5 text-text-muted">{sentCount}</span>
                </p>
                <div className="flex flex-col gap-1">
                  {sentRequests!.map((r) => (
                    <div key={r.friendshipId} className="flex items-center gap-3 p-2 rounded-xl">
                      <Avatar initials={getInitials(r.user.displayName ?? "?")} size={32} src={r.user.avatarUrl} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-text-primary truncate">{r.user.displayName ?? "User"}</p>
                        <p className="text-[10px] text-text-muted">Pending</p>
                      </div>
                      <button
                        onClick={() =>
                          cancelRequest.mutate(r.friendshipId, {
                            onSuccess: () => toast("Request cancelled"),
                            onError: () => toast("Failed to cancel", "error"),
                          })
                        }
                        disabled={cancelRequest.isPending}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-oria-chip border border-oria text-text-muted min-h-[28px] cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Leaderboard */}
          <Card>
            <p className="text-base font-bold text-text-primary mb-3 tracking-tight">Leaderboard</p>
            {sortedBoard.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {sortedBoard.map((p) => (
                  <PodiumRow
                    key={p.id}
                    rank={p.rank}
                    name={p.displayName ?? "User"}
                    streak={p.streak}
                    apy={p.apy}
                    isMe={p.isMe}
                    initials={getInitials(p.displayName)}
                    avatarUrl={p.avatarUrl}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-accent-purple/15 border border-accent-purple/25 flex items-center justify-center mx-auto mb-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                </div>
                <p className="text-[14px] font-semibold text-text-primary mb-1">No friends yet</p>
                <p className="text-[12px] text-text-muted">Use the search bar above to find and add friends.</p>
              </div>
            )}
          </Card>

          {/* My friends */}
          {friendCount > 0 && (
            <Card>
              <p className="text-base font-bold text-text-primary mb-3 tracking-tight">
                My friends
                <span className="ml-2 text-[12px] font-semibold text-text-muted">{friendCount}</span>
              </p>
              <div className="flex flex-col gap-1">
                {friends!.map((f) => (
                  <div key={f.friendshipId} className="flex items-center gap-3 p-2.5 rounded-xl">
                    <Link href={`/friend/${f.user.id}`} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer active:opacity-70 transition-opacity">
                      <Avatar initials={getInitials(f.user.displayName ?? "?")} size={36} src={f.user.avatarUrl} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-text-primary truncate">{f.user.displayName ?? "User"}</p>
                        <p className="text-[11px] text-text-muted tabular-nums">
                          {f.user.streak ? `${f.user.streak.currentCount}w streak · ${f.user.streak.currentApy.toFixed(1)}% APY` : "New user"}
                        </p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64697A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                    <div className="flex gap-1.5 ml-1">
                      <button
                        onClick={() =>
                          pokeFriend.mutate(f.user.id, {
                            onSuccess: (data) => toast(data.message),
                            onError: (e) => toast(e instanceof Error ? e.message : "Can't poke right now", "error"),
                          })
                        }
                        disabled={pokeFriend.isPending}
                        aria-label={`Poke ${f.user.displayName}`}
                        className="w-[32px] h-[32px] rounded-full bg-accent-sport/15 border border-accent-sport/25 flex items-center justify-center cursor-pointer disabled:opacity-50 hover:bg-accent-sport/25 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FC4C02" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 01-3.46 0" />
                        </svg>
                      </button>
                      <button
                        onClick={() =>
                          removeFriend.mutate(f.friendshipId, {
                            onSuccess: () => toast(`${f.user.displayName ?? "User"} removed`),
                            onError: () => toast("Failed to remove", "error"),
                          })
                        }
                        disabled={removeFriend.isPending}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-oria-chip border border-oria text-text-muted min-h-[32px] cursor-pointer disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Suggested */}
          {discoverUsers && discoverUsers.length > 0 && (
            <Card>
              <p className="text-base font-bold text-text-primary mb-3 tracking-tight">Suggested</p>
              <div className="flex flex-col gap-1">
                {discoverUsers.slice(0, 5).map((u) => {
                  const status = getStatus(u.id);
                  return (
                    <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-oria-chip transition-colors">
                      <Avatar initials={getInitials(u.displayName ?? "?")} size={36} src={u.avatarUrl} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-text-primary truncate">{u.displayName ?? "User"}</p>
                        <p className="text-[11px] text-text-muted tabular-nums">
                          {u.streak ? `${u.streak.currentCount}w streak · ${u.streak.currentApy.toFixed(1)}% APY` : "New user"}
                        </p>
                      </div>
                      <UserActionButton
                        userId={u.id}
                        displayName={u.displayName ?? "user"}
                        status={status}
                        onSend={handleSend}
                        isSending={sendRequest.isPending}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Activity feed */}
          <Card>
            <p className="text-base font-bold text-text-primary mb-3 tracking-tight">Activity feed</p>
            {feed && feed.length > 0 ? (
              feed.map((f, i) => {
                const { text, emoji } = formatFeedEvent(f.eventType, f.payload as Record<string, unknown>);
                return (
                  <div key={f.id} className={`flex gap-3 py-3 ${i < feed.length - 1 ? "border-b border-oria" : ""}`}>
                    <Avatar initials={getInitials(f.user.displayName)} size={36} src={f.user.avatarUrl} />
                    <div className="flex-1">
                      <p className="text-[13px] text-text-primary leading-snug">
                        <span className="font-semibold">{f.user.displayName ?? "User"}</span>{" "}
                        <span className="text-text-secondary">{text}</span>{" "}
                        <span className="text-base">{emoji}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-[11px] text-text-muted">{timeAgo(f.createdAt)}</p>
                        <button
                          onClick={() => likeFeed.mutate(f.id)}
                          className="flex items-center gap-1 text-[11px] text-text-muted hover:text-accent-purple-bright cursor-pointer transition-colors"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill={f.likes > 0 ? "#A78BFA" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                          {f.likes > 0 && <span>{f.likes}</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-sm font-semibold text-text-primary mb-1">No activity yet</p>
                <p className="text-[12px] text-text-muted">Your friends&apos; activity will appear here.</p>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
