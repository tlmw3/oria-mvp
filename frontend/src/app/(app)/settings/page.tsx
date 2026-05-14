"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/Card";
import { CardSkeleton } from "@/components/Skeleton";
import { useUser, useStreak, useStartVacation, useEndVacation } from "@/lib/hooks";
import { useToast } from "@/components/Toast";
import { apiFetch } from "@/lib/api";
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } from "@/lib/push";
import Link from "next/link";

interface Settings {
  notifRunReminders: boolean;
  notifPokes: boolean;
  notifFriendRequests: boolean;
  notifWeeklySummary: boolean;
  privacyShowOnLeaderboard: boolean;
  privacyShowActivityToFriends: boolean;
  unitsKm: boolean;
  currency: "USD" | "EUR";
  monthlyProgressionPct: number;
}

const DEFAULTS: Settings = {
  notifRunReminders: true,
  notifPokes: true,
  notifFriendRequests: true,
  notifWeeklySummary: true,
  privacyShowOnLeaderboard: true,
  privacyShowActivityToFriends: true,
  unitsKm: true,
  currency: "USD",
  monthlyProgressionPct: 10,
};

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-3 cursor-pointer"
    >
      <div className="text-left pr-4">
        <p className="text-[14px] font-semibold text-text-primary">{label}</p>
        {description && (
          <p className="text-[12px] text-text-muted mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div
        className={`relative w-[44px] h-[26px] rounded-full flex-shrink-0 transition-colors duration-200 ${
          checked ? "bg-accent-purple" : "bg-oria-strong"
        }`}
      >
        <div
          className={`absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-[21px]" : "translate-x-[3px]"
          }`}
        />
      </div>
    </button>
  );
}

export default function SettingsPage() {
  const { data: user, isLoading, refetch } = useUser();
  const { data: streak } = useStreak();
  const startVacation = useStartVacation();
  const endVacation = useEndVacation();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const vacationActive = !!streak?.vacationUntil && new Date(streak.vacationUntil) > new Date();
  const vacationEndsAt = streak?.vacationUntil ? new Date(streak.vacationUntil) : null;
  const vacationDaysLeft = vacationEndsAt
    ? Math.max(0, Math.ceil((vacationEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  useEffect(() => {
    if (user?.settings) {
      setSettings({ ...DEFAULTS, ...user.settings });
    }
  }, [user]);

  useEffect(() => {
    const checkPush = async () => {
      if (isPushSupported()) {
        setPushSupported(true);
        setPushEnabled(await isPushSubscribed());
      }
    };
    checkPush();
  }, []);

  const handlePushToggle = async (enable: boolean) => {
    setPushLoading(true);
    try {
      if (enable) {
        const ok = await subscribeToPush();
        if (ok) {
          setPushEnabled(true);
          toast("Push notifications enabled!");
        } else {
          toast("Permission denied — check your browser settings", "error");
        }
      } else {
        await unsubscribeFromPush();
        setPushEnabled(false);
        toast("Push notifications disabled");
      }
    } catch {
      toast("Failed to update push notifications", "error");
    } finally {
      setPushLoading(false);
    }
  };

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ settings }),
      });
      await refetch();
      setDirty(false);
      toast("Settings saved!");
    } catch {
      toast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="pt-1 pb-2"><div className="h-7 w-24 skeleton-shimmer rounded" /></div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="pt-1 pb-1 flex items-center gap-3">
        <Link
          href="/profile"
          className="w-9 h-9 rounded-full bg-oria-chip border border-oria flex items-center justify-center cursor-pointer hover:bg-oria-elevated transition-colors"
          aria-label="Back to profile"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA0AC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Settings</h1>
      </div>

      {/* Vacation mode */}
      <Card>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-accent-sport/15 border border-accent-sport/25 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FC4C02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Vacation mode</p>
        </div>
        <div className="py-3">
          <p className="text-[13px] text-text-secondary leading-relaxed">
            Freeze your streak and APY progression for 2 weeks — in case of vacation or injury. The
            weekly evaluation won&apos;t reset your streak while active.
          </p>
        </div>
        {vacationActive ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-accent-sport/10 border border-accent-sport/25">
              <div className="w-2 h-2 rounded-full bg-accent-sport animate-pulse" />
              <p className="text-[12px] text-accent-sport font-semibold flex-1">
                Vacation active — {vacationDaysLeft} day{vacationDaysLeft === 1 ? "" : "s"} left
              </p>
              <span className="text-[11px] text-text-muted tabular-nums">
                Ends {vacationEndsAt?.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                endVacation.mutate(undefined, {
                  onSuccess: () => toast("Vacation mode ended"),
                  onError: () => toast("Failed to end vacation", "error"),
                });
              }}
              disabled={endVacation.isPending}
              className="w-full py-3 rounded-xl border border-oria bg-oria-chip text-text-secondary font-semibold text-[13px] cursor-pointer disabled:opacity-50 hover:bg-oria-elevated transition-colors"
            >
              {endVacation.isPending ? "Ending…" : "End vacation early"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Freeze your streak for 2 weeks? Your current streak count and APY will be preserved.")) {
                startVacation.mutate(undefined, {
                  onSuccess: () => toast("Vacation mode started — your streak is frozen"),
                  onError: () => toast("Failed to start vacation", "error"),
                });
              }
            }}
            disabled={startVacation.isPending}
            className="w-full py-3 rounded-xl gradient-brand text-white font-semibold text-[13px] shadow-button cursor-pointer disabled:opacity-50"
          >
            {startVacation.isPending ? "Starting…" : "Start 2-week vacation"}
          </button>
        )}
      </Card>

      {/* Push Notifications */}
      {pushSupported && (
        <Card>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-green-500/15 border border-green-500/25 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 17H2a3 3 0 003-3V9a7 7 0 0114 0v5a3 3 0 003 3zm-8.27 4a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Push Notifications</p>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center justify-between w-full py-3">
              <div className="text-left pr-4">
                <p className="text-[14px] font-semibold text-text-primary">
                  {pushLoading ? "Updating..." : pushEnabled ? "Enabled" : "Enable push notifications"}
                </p>
                <p className="text-[12px] text-text-muted mt-0.5 leading-relaxed">
                  Get notified about friend pokes, goal completions, and more — even when the app is closed
                </p>
              </div>
              <button
                type="button"
                onClick={() => handlePushToggle(!pushEnabled)}
                disabled={pushLoading}
                className="cursor-pointer disabled:opacity-50"
              >
                <div
                  className={`relative w-[44px] h-[26px] rounded-full flex-shrink-0 transition-colors duration-200 ${
                    pushEnabled ? "bg-green-500" : "bg-oria-strong"
                  }`}
                >
                  <div
                    className={`absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      pushEnabled ? "translate-x-[21px]" : "translate-x-[3px]"
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Notifications */}
      <Card>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-accent-purple/15 border border-accent-purple/25 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </div>
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Notifications</p>
        </div>
        <div className="flex flex-col divide-y divide-oria">
          <Toggle
            checked={settings.notifRunReminders}
            onChange={(v) => update("notifRunReminders", v)}
            label="Run reminders"
            description="Daily reminder at 7 AM on your scheduled run days"
          />
          <Toggle
            checked={settings.notifPokes}
            onChange={(v) => update("notifPokes", v)}
            label="Friend pokes"
            description="Let friends send you motivational nudges"
          />
          <Toggle
            checked={settings.notifFriendRequests}
            onChange={(v) => update("notifFriendRequests", v)}
            label="Friend requests"
            description="When someone sends you a friend request"
          />
          <Toggle
            checked={settings.notifWeeklySummary}
            onChange={(v) => update("notifWeeklySummary", v)}
            label="Weekly summary"
            description="Recap of your week every Sunday"
          />
        </div>
      </Card>

      {/* Privacy */}
      <Card>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-accent-gold/15 border border-accent-gold/25 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Privacy</p>
        </div>
        <div className="flex flex-col divide-y divide-oria">
          <Toggle
            checked={settings.privacyShowOnLeaderboard}
            onChange={(v) => update("privacyShowOnLeaderboard", v)}
            label="Show on leaderboard"
            description="Appear in your friends' leaderboard rankings"
          />
          <Toggle
            checked={settings.privacyShowActivityToFriends}
            onChange={(v) => update("privacyShowActivityToFriends", v)}
            label="Share activity with friends"
            description="Let friends see your weekly distance and progress"
          />
        </div>
      </Card>

      {/* Units */}
      <Card>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-accent-sport/15 border border-accent-sport/25 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FC4C02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 20h20" />
              <path d="M2 20V4l4 4 4-6 4 6 4-4 4 4v12" />
            </svg>
          </div>
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Units</p>
        </div>
        <div className="flex flex-col divide-y divide-oria">
          <Toggle
            checked={settings.unitsKm}
            onChange={(v) => update("unitsKm", v)}
            label={settings.unitsKm ? "Kilometers" : "Miles"}
            description={settings.unitsKm ? "Switch to miles" : "Switch to kilometers"}
          />
        </div>
      </Card>

      {/* Monthly progression */}
      <Card>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-accent-gold/15 border border-accent-gold/25 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Monthly progression</p>
        </div>
        <div className="py-3">
          <p className="text-[12px] text-text-muted mb-3 leading-relaxed">
            How much your weekly target should grow each month. Pick <strong>Maintenance</strong> to
            keep the same target, or a higher rate to gradually push yourself.
          </p>
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-oria-chip border border-oria">
            {[
              { value: 0, label: "Maintain" },
              { value: 5, label: "+5%" },
              { value: 10, label: "+10%" },
              { value: 15, label: "+15%" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => update("monthlyProgressionPct", opt.value)}
                className={`py-2.5 rounded-xl text-[12px] font-semibold transition-colors cursor-pointer ${
                  settings.monthlyProgressionPct === opt.value
                    ? "gradient-brand text-white shadow-button"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Currency */}
      <Card>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-success-500/15 border border-success-500/25 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Currency</p>
        </div>
        <div className="py-3">
          <p className="text-[12px] text-text-muted mb-3 leading-relaxed">
            Display balances and earnings in your preferred currency. EUR is converted at a fixed rate of 0.92 (rate refresh coming soon).
          </p>
          <div className="flex gap-1.5 p-1 rounded-2xl bg-oria-chip border border-oria">
            {(["USD", "EUR"] as const).map((c) => (
              <button
                key={c}
                onClick={() => update("currency", c)}
                className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer ${
                  settings.currency === c
                    ? "gradient-brand text-white shadow-button"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {c === "USD" ? "$ USD" : "€ EUR"}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Save */}
      <div className="mt-2 pb-4">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="w-full h-[52px] rounded-2xl gradient-brand text-white font-semibold text-base shadow-button cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </span>
          ) : dirty ? "Save changes" : "All saved"}
        </button>
      </div>
    </div>
  );
}
