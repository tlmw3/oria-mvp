"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/Card";
import { CardSkeleton } from "@/components/Skeleton";
import { useUser, useAppleHealthStatus, useConnectAppleHealth, useStravaStatus, useStravaSync } from "@/lib/hooks";
import { useToast } from "@/components/Toast";
import { apiFetch } from "@/lib/api";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";

export default function ProfilePage() {
  const { data: user, isLoading, refetch } = useUser();
  const { toast } = useToast();
  const { logout } = usePrivy();
  const { data: healthStatus } = useAppleHealthStatus();
  const connectHealth = useConnectAppleHealth();
  const { data: stravaStatus } = useStravaStatus();
  const stravaSync = useStravaSync();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [goalType, setGoalType] = useState("running");
  const [targetKm, setTargetKm] = useState(10);
  const [runSchedule, setRunSchedule] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const DAYS = [
    { id: 1, short: "Mon" },
    { id: 2, short: "Tue" },
    { id: 3, short: "Wed" },
    { id: 4, short: "Thu" },
    { id: 5, short: "Fri" },
    { id: 6, short: "Sat" },
    { id: 0, short: "Sun" },
  ];

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? "");
      setAvatarUrl(user.avatarUrl ?? null);
      setGoalType(user.goalType);
      setTargetKm(user.targetKm);
      setRunSchedule(user.runSchedule ?? []);
    }
  }, [user]);

  const handleAvatarPick = () => fileInputRef.current?.click();
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Raw bytes; base64 string is ~33% larger and must stay under the 700K
    // char backend cap, so 500 KB raw is the safe headroom.
    if (file.size > 500_000) {
      toast("Image too large (max 500 KB)", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="pt-1 pb-2">
          <div className="h-7 w-24 skeleton-shimmer rounded" />
        </div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName, avatarUrl, goalType, targetKm, runSchedule }),
      });
      await refetch();
      toast("Profile updated!");
    } catch (e) {
      const msg = e instanceof Error && e.message && !e.message.startsWith("API error")
        ? e.message
        : "Failed to save changes";
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const activities = [
    { id: "running", label: "Running" },
    { id: "cycling", label: "Cycling" },
    { id: "steps", label: "Steps" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="pt-1 pb-1">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Profile</h1>
      </div>

      {/* Avatar & Name */}
      <div className="flex flex-col items-center py-4">
        <div className="relative mb-4">
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={avatarUrl}
              alt="Profile"
              className="rounded-full object-cover"
              style={{
                width: 84,
                height: 84,
                border: "2px solid #A78BFA",
                boxShadow: "0 4px 16px rgba(139,92,246,0.4)",
              }}
            />
          ) : (
            <div
              className="rounded-full flex items-end justify-center overflow-hidden"
              style={{
                width: 84,
                height: 84,
                background: "linear-gradient(160deg, rgba(167,139,250,0.18), rgba(124,58,237,0.10))",
                border: "2px solid #A78BFA",
                boxShadow: "0 4px 16px rgba(139,92,246,0.4)",
              }}
              aria-label="No profile photo set"
            >
              <svg
                width={84}
                height={84}
                viewBox="0 0 64 64"
                fill="none"
                stroke="#E9D5FF"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="32" cy="24" r="11" />
                <path d="M11 60c0-11.6 9.4-21 21-21s21 9.4 21 21" />
              </svg>
            </div>
          )}
          <button
            onClick={handleAvatarPick}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full gradient-brand flex items-center justify-center shadow-button border-2 border-[#07070B] cursor-pointer active:scale-90 transition-transform"
            aria-label="Upload profile photo"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
        <p className="text-lg font-bold text-text-primary">{displayName || "Set your name"}</p>
        {avatarUrl ? (
          <button
            onClick={() => setAvatarUrl(null)}
            className="text-[11px] text-text-muted mt-1 cursor-pointer bg-transparent"
          >
            Remove photo
          </button>
        ) : (
          <button
            onClick={handleAvatarPick}
            className="text-[11px] text-accent-purple-bright mt-1 cursor-pointer bg-transparent font-semibold"
          >
            Upload a photo
          </button>
        )}
      </div>

      {/* Display Name */}
      <Card>
        <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 block">
          Display name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          className="w-full px-4 py-3 rounded-xl border border-oria bg-oria-section text-[15px] text-text-primary placeholder:text-text-muted focus:border-accent-purple outline-none"
        />
      </Card>

      {/* Goal Settings */}
      <Card>
        <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3 block">
          Activity type
        </label>
        <div className="flex gap-2 mb-5">
          {activities.map((a) => (
            <button
              key={a.id}
              onClick={() => setGoalType(a.id)}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer transition-colors border ${
                goalType === a.id
                  ? "gradient-brand text-white border-transparent shadow-button"
                  : "bg-oria-chip text-text-secondary border-oria"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 block">
          Weekly target
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTargetKm(Math.max(1, targetKm - 1))}
            className="w-11 h-11 rounded-xl bg-oria-chip border border-oria flex items-center justify-center text-text-primary text-lg font-bold cursor-pointer flex-shrink-0"
          >
            −
          </button>
          <div className="flex-1 px-4 py-3 rounded-xl border border-oria bg-oria-section text-center">
            <span className="text-xl font-extrabold text-text-primary tabular-nums">{targetKm}</span>
            <span className="text-sm text-text-muted font-medium ml-1">
              {goalType === "steps" ? "k steps" : "km"}
            </span>
          </div>
          <button
            onClick={() => setTargetKm(targetKm + 1)}
            className="w-11 h-11 rounded-xl bg-oria-chip border border-oria flex items-center justify-center text-text-primary text-lg font-bold cursor-pointer flex-shrink-0"
          >
            +
          </button>
        </div>
      </Card>

      {/* Run Schedule */}
      <Card>
        <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1 block">
          Run schedule
        </label>
        <p className="text-[12px] text-text-muted mb-3">
          Pick your run days — get a reminder at 7 AM
        </p>
        <div className="flex gap-1.5">
          {DAYS.map((d) => {
            const active = runSchedule.includes(d.id);
            return (
              <button
                key={d.id}
                onClick={() =>
                  setRunSchedule((prev) =>
                    active ? prev.filter((x) => x !== d.id) : [...prev, d.id],
                  )
                }
                className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold cursor-pointer transition-colors border ${
                  active
                    ? "gradient-brand text-white border-transparent shadow-button"
                    : "bg-oria-chip text-text-secondary border-oria"
                }`}
              >
                {d.short}
              </button>
            );
          })}
        </div>
        {runSchedule.length > 0 && (
          <p className="text-[11px] text-text-muted mt-2">
            {runSchedule.length} session{runSchedule.length > 1 ? "s" : ""}/week selected
          </p>
        )}
      </Card>

      {/* Connected Apps */}
      <Card>
        <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3 block">
          Connected apps
        </label>
        <div className="flex flex-col">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-sport/15 border border-accent-sport/25 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#FC4C02">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-.956l2.09 4.128L3 0h4.138" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-text-primary">Strava</p>
                <p className="text-[11px] text-text-muted">Auto-sync activities</p>
              </div>
            </div>
            {stravaStatus?.connected ? (
              <button
                onClick={() => stravaSync.mutate(undefined, {
                  onSuccess: (data) => toast(`Synced ${data.synced} weeks from Strava`),
                  onError: () => toast("Sync failed", "error"),
                })}
                disabled={stravaSync.isPending}
                className="text-[11px] font-semibold px-3.5 py-1.5 rounded-full bg-accent-purple/15 border border-accent-purple/25 text-accent-purple-bright cursor-pointer min-h-[32px] disabled:opacity-50 flex items-center gap-1.5"
              >
                {stravaSync.isPending ? (
                  <span className="inline-block w-3 h-3 border-2 border-accent-purple-bright/30 border-t-accent-purple-bright rounded-full animate-spin" />
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
                    <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>
                  </svg>
                )} {stravaSync.isPending ? "Syncing…" : "Sync"}
              </button>
            ) : (
              <button
                onClick={() => {
                  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID ?? "209985";
                  const redirectUri = process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI ?? `${window.location.origin}/strava/callback`;
                  const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=activity:read_all`;
                  window.location.href = url;
                }}
                className="text-[11px] font-semibold text-white gradient-brand px-3.5 py-1.5 rounded-full shadow-button min-h-[32px]"
              >
                Connect
              </button>
            )}
          </div>
          <div className="h-px bg-oria" />
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-error-100 border border-error-500/25 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#FF2D55">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-text-primary">Apple Health</p>
                <p className="text-[11px] text-text-muted">Sync running activities</p>
              </div>
            </div>
            {healthStatus?.connected ? (
              <span className="text-[11px] font-semibold text-success-500 bg-success-100 border border-success-500/25 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Connected
              </span>
            ) : (
              <button
                onClick={() => {
                  connectHealth.mutate(undefined, {
                    onSuccess: () => toast("Apple Health connected!"),
                    onError: (e) => toast(e instanceof Error ? e.message : "Failed", "error"),
                  });
                }}
                disabled={connectHealth.isPending}
                className="text-[11px] font-semibold text-white gradient-brand px-3.5 py-1.5 rounded-full shadow-button min-h-[32px] disabled:opacity-50"
              >
                {connectHealth.isPending ? "Connecting…" : "Connect"}
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Settings link */}
      <Link
        href="/settings"
        className="flex items-center justify-between px-5 py-4 bg-oria-card rounded-xl border border-oria backdrop-blur-[18px] shadow-card cursor-pointer hover:bg-oria-card-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-purple/15 border border-accent-purple/25 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-text-primary">Settings</p>
            <p className="text-[11px] text-text-muted">Notifications, privacy, units</p>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64697A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>

      {/* Save & Sign Out */}
      <div className="flex flex-col gap-2 mt-2 pb-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-[52px] rounded-2xl gradient-brand text-white font-semibold text-base shadow-button cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving…
            </span>
          ) : "Save changes"}
        </button>
        <button
          onClick={async () => {
            await logout();
            document.cookie = "oria_onboarded=; path=/; max-age=0";
            window.location.href = "/";
          }}
          className="w-full py-3 text-[13px] text-error-500 font-semibold cursor-pointer bg-transparent"
        >
          Sign out
        </button>
        <button
          onClick={() => {
            document.cookie = "oria_onboarded=; path=/; max-age=0";
            window.location.href = "/";
          }}
          className="w-full py-2 text-[12px] text-text-muted font-medium cursor-pointer bg-transparent hover:text-text-secondary"
        >
          Reset demo
        </button>
      </div>
    </div>
  );
}
