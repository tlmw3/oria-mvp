"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";

// Types matching backend responses
interface Streak {
  id: string;
  userId: string;
  currentCount: number;
  longestCount: number;
  lastWeekMet: boolean;
  currentApy: number;
  regularityBonus: number;
  longRunBonus: number;
  progressionBonus: number;
  effectiveApy: number;
  weekSessions: number;
  weekLongestRun: number;
  monthAvgPace: number;
  prevMonthAvgPace: number;
  vacationUntil: string | null;
  activityScore: number;
  poolBonus: number;
  apyBreakdown?: {
    vaultRate: number;
    spread: number;
    baseline: number;
    poolRate: number;
    bonus: number;
    effective: number;
    meanScore: number;
  };
  currentWeek: {
    weekStart: string;
    distanceKm: number;
    goalMet: boolean;
  };
}

interface User {
  id: string;
  privyId: string;
  displayName: string | null;
  avatarUrl: string | null;
  goalType: string;
  targetKm: number;
  dataSource: string;
  runSchedule: number[];
  settings: {
    notifRunReminders?: boolean;
    notifPokes?: boolean;
    notifFriendRequests?: boolean;
    notifWeeklySummary?: boolean;
    privacyShowOnLeaderboard?: boolean;
    privacyShowActivityToFriends?: boolean;
    unitsKm?: boolean;
    currency?: "USD" | "EUR";
    monthlyProgressionPct?: number;
    runPlan?: { sessionsPerWeek: number; longRunKm: number };
  };
  streak: {
    currentCount: number;
    longestCount: number;
    currentApy: number;
    lastWeekMet: boolean;
  } | null;
}

interface Activity {
  id: string;
  userId: string;
  weekStart: string;
  distanceKm: number;
  source: string;
  goalMet: boolean;
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  streak: number;
  apy: number;
  isMe: boolean;
}

interface FeedEvent {
  id: string;
  userId: string;
  eventType: string;
  payload: Record<string, unknown>;
  likes: number;
  likedBy: string[];
  createdAt: string;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface Challenge {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  goalKmWeek: number;
  startDate: string;
  endDate: string;
  maxMembers: number | null;
  status: string;
  members: Array<{
    id: string;
    userId: string;
    weeksMet: number;
    weeksTotal: number;
    user: {
      id: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
  }>;
  _count: { members: number };
}

interface WalletBalance {
  walletAddr: string | null;
  balances: { USDC: number; AVAX: number };
  chain: string;
}

interface Earnings {
  totalDeposited: number;
  totalEarned: number;
  currentApy: number;
  projectedWeekly: number;
  projectedAnnual: number;
}

interface Deposit {
  id: string;
  amount: number;
  token: string;
  status: string;
  createdAt: string;
}

// Hooks
export function useLastRun() {
  return useQuery<{ lastRun: { name: string; distanceKm: number; date: string; movingTimeSec: number; type: string } | null }>({
    queryKey: ["strava", "last-run"],
    queryFn: () => apiFetch("/api/strava/last-run"),
  });
}

export function useStravaStatus() {
  return useQuery<{ connected: boolean }>({
    queryKey: ["strava", "status"],
    queryFn: () => apiFetch("/api/strava/status"),
  });
}

interface LastRun {
  name: string;
  distanceKm: number;
  date: string;
  movingTimeSec: number;
  type: string;
}

export function useStravaSync() {
  const queryClient = useQueryClient();
  return useMutation<{ synced: number; lastRun: LastRun | null }>({
    mutationFn: () => apiFetch("/api/strava/sync", { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streak"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["strava", "last-run"] });
    },
  });
}

export function useUser() {
  return useQuery<User>({
    queryKey: ["user", "me"],
    queryFn: () => apiFetch("/api/users/me"),
  });
}

interface UserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  goalType: string;
  targetKm: number;
  createdAt: string;
  streak: {
    currentCount: number;
    longestCount: number;
    currentApy: number;
    effectiveApy: number;
  } | null;
  activities: Array<{
    weekStart: string;
    distanceKm: number;
    goalMet: boolean;
  }>;
  stats: {
    totalKm: number;
    weeksActive: number;
    goalMetWeeks: number;
  };
}

export function useUserProfile(userId: string) {
  return useQuery<UserProfile>({
    queryKey: ["user", "profile", userId],
    queryFn: () => apiFetch(`/api/users/${userId}/profile`),
    enabled: !!userId,
  });
}

export function useStreak() {
  return useQuery<Streak>({
    queryKey: ["streak", "me"],
    queryFn: () => apiFetch("/api/streaks/me"),
  });
}

export function useStartVacation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/api/streaks/vacation", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["streak", "me"] }),
  });
}

export function useEndVacation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/api/streaks/vacation", { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["streak", "me"] }),
  });
}

export function useActivities(weeks = 12) {
  return useQuery<Activity[]>({
    queryKey: ["activities", weeks],
    queryFn: () => apiFetch(`/api/activities?weeks=${weeks}`),
  });
}

export function useLeaderboard() {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard"],
    queryFn: () => apiFetch("/api/leaderboard"),
  });
}

export function useFeed(limit = 20) {
  return useQuery<FeedEvent[]>({
    queryKey: ["feed", limit],
    queryFn: () => apiFetch(`/api/feed?limit=${limit}`),
  });
}

export function useChallenges() {
  return useQuery<Challenge[]>({
    queryKey: ["challenges"],
    queryFn: () => apiFetch("/api/challenges"),
  });
}

export function useWalletBalance() {
  return useQuery<WalletBalance>({
    queryKey: ["wallet", "balance"],
    queryFn: () => apiFetch("/api/wallet/balance"),
  });
}

export function useEarnings() {
  return useQuery<Earnings>({
    queryKey: ["wallet", "earnings"],
    queryFn: () => apiFetch("/api/wallet/earnings"),
  });
}

export function useDeposits() {
  return useQuery<Deposit[]>({
    queryKey: ["wallet", "deposits"],
    queryFn: () => apiFetch("/api/wallet/deposits"),
  });
}

export function useLogActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { distanceKm: number; weekStart?: string }) =>
      apiFetch("/api/activities", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streak"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; token: string; txHash?: string }) =>
      apiFetch("/api/wallet/deposit", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useCreateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      goalKmWeek: number;
      durationWeeks: number;
      maxMembers?: number;
      description?: string;
    }) => {
      const startDate = new Date().toISOString();
      const endDate = new Date(
        Date.now() + data.durationWeeks * 7 * 86400_000,
      ).toISOString();
      return apiFetch("/api/challenges", {
        method: "POST",
        body: JSON.stringify({
          title: data.title,
          goalKmWeek: data.goalKmWeek,
          startDate,
          endDate,
          maxMembers: data.maxMembers,
          description: data.description,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
  });
}

// ── Social ──

interface DiscoverUser {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  goalType: string;
  streak: { currentCount: number; currentApy: number } | null;
}

export function useDiscoverUsers() {
  return useQuery<DiscoverUser[]>({
    queryKey: ["users", "discover"],
    queryFn: () => apiFetch("/api/users/discover"),
  });
}

export function useSearchUsers(q: string) {
  return useQuery<DiscoverUser[]>({
    queryKey: ["users", "search", q],
    queryFn: () => apiFetch(`/api/users/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  });
}

interface NotificationItem {
  id: string;
  type: string;
  payload: {
    friendshipId?: string;
    fromUserId?: string;
    fromDisplayName?: string;
    fromAvatarUrl?: string | null;
  };
  read: boolean;
  createdAt: string;
}

interface PendingRequest {
  friendshipId: string;
  user: DiscoverUser;
  createdAt: string;
}

export function useNotifications() {
  return useQuery<NotificationItem[]>({
    queryKey: ["notifications"],
    queryFn: () => apiFetch("/api/notifications"),
  });
}

export function useUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ["notifications", "unread"],
    queryFn: () => apiFetch("/api/notifications/unread-count"),
    refetchInterval: 15_000,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/api/notifications/mark-read", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function usePendingRequests() {
  return useQuery<PendingRequest[]>({
    queryKey: ["friends", "pending"],
    queryFn: () => apiFetch("/api/friends/pending"),
  });
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendshipId: string) =>
      apiFetch(`/api/friends/${friendshipId}/accept`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useRejectFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendshipId: string) =>
      apiFetch(`/api/friends/${friendshipId}/reject`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

interface FriendEntry {
  friendshipId: string;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
    streak: { currentCount: number; currentApy: number } | null;
  };
}

interface FriendWeeklyProgress {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  targetKm: number;
  isMe: boolean;
  distanceKm: number;
  goalMet: boolean;
  streakCount: number;
  weekSessions: number;
}

export function useFriendsWeekly() {
  return useQuery<FriendWeeklyProgress[]>({
    queryKey: ["friends", "weekly"],
    queryFn: () => apiFetch("/api/friends/weekly"),
  });
}

export function useFriends() {
  return useQuery<FriendEntry[]>({
    queryKey: ["friends", "list"],
    queryFn: () => apiFetch("/api/friends"),
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendshipId: string) =>
      apiFetch(`/api/friends/${friendshipId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["users", "discover"] });
    },
  });
}

export function useSentRequests() {
  return useQuery<PendingRequest[]>({
    queryKey: ["friends", "sent"],
    queryFn: () => apiFetch("/api/friends/sent"),
  });
}

export function useCancelFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendshipId: string) =>
      apiFetch(`/api/friends/sent/${friendshipId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["users", "discover"] });
    },
  });
}

export function usePokeFriend() {
  const queryClient = useQueryClient();
  return useMutation<{ poked: boolean; message: string }, Error, string>({
    mutationFn: (friendUserId: string) =>
      apiFetch(`/api/friends/${friendUserId}/poke`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (addresseeId: string) =>
      apiFetch("/api/friends/request", {
        method: "POST",
        body: JSON.stringify({ addresseeId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "discover"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

// ── Apple Health ──
// Client-side only — no API route needed since this is a demo feature

export function useAppleHealthStatus() {
  return useQuery<{ connected: boolean }>({
    queryKey: ["apple-health"],
    queryFn: () => {
      if (typeof window === "undefined") return { connected: false };
      return { connected: localStorage.getItem("oria_apple_health") === "true" };
    },
    staleTime: Infinity,
  });
}

export function useConnectAppleHealth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      localStorage.setItem("oria_apple_health", "true");
      return { connected: true };
    },
    onSuccess: () => {
      queryClient.setQueryData(["apple-health"], { connected: true });
    },
  });
}

export function useSyncAppleHealth() {
  const queryClient = useQueryClient();
  return useMutation<{ distanceKm: number }>({
    mutationFn: async () => {
      if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
        throw new Error("Apple Health sync not available yet — use Strava");
      }
      const distanceKm = parseFloat((Math.random() * 2.5 + 3).toFixed(1));
      await apiFetch("/api/activities", {
        method: "POST",
        body: JSON.stringify({ distanceKm }),
      });
      return { distanceKm };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streak"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useJoinChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (challengeId: string) =>
      apiFetch(`/api/challenges/${challengeId}/join`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
  });
}

export function useDeleteChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (challengeId: string) =>
      apiFetch(`/api/challenges/${challengeId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
  });
}

// ── Weekly Leaderboard ──

interface WeeklyLeaderboardEntry {
  rank: number;
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  distanceKm: number;
  isMe: boolean;
}

export function useWeeklyLeaderboard() {
  return useQuery<WeeklyLeaderboardEntry[]>({
    queryKey: ["leaderboard", "weekly"],
    queryFn: () => apiFetch("/api/leaderboard/weekly"),
  });
}

// ── Feed Reactions ──

export function useLikeFeedEvent() {
  const queryClient = useQueryClient();
  return useMutation<{ likes: number; liked: boolean }, Error, string>({
    mutationFn: (eventId: string) =>
      apiFetch(`/api/feed/${eventId}/like`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

// ── Streak Recovery ──

export function useRecoverStreak() {
  const queryClient = useQueryClient();
  return useMutation<{ recovered: boolean; newCount: number }>({
    mutationFn: () =>
      apiFetch("/api/streaks/recover", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streak"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}
