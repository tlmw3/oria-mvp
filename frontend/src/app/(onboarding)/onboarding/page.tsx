"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { apiFetch, setAuthTokenGetter } from "@/lib/api";
import { usePrivy, useLogin, type User } from "@privy-io/react-auth";
import { QRCodeSVG } from "qrcode.react";
import { useWalletBalance } from "@/lib/hooks";
import { useToast } from "@/components/Toast";

function deriveDisplayName(user: User): string {
  const u = user as unknown as {
    google?: { name?: string; email?: string };
    apple?: { email?: string };
    email?: { address?: string };
  };
  const candidates = [
    u.google?.name?.trim(),
    u.email?.address?.split("@")[0],
    u.google?.email?.split("@")[0],
    u.apple?.email?.split("@")[0],
  ].filter((s): s is string => !!s && s.length > 0);
  if (candidates.length > 0) return candidates[0].slice(0, 50);
  return "";
}

const STEPS = 5;

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current
              ? "w-6 gradient-brand"
              : i < current
                ? "w-2 bg-purple-400"
                : "w-2 bg-purple-100"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Step 1: Welcome ───
function WelcomeStep({ onNext, onSignIn }: { onNext: () => void; onSignIn: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 py-10">
      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center shadow-button">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L13.09 8.26L18 4L14.74 9.91L21 11L14.74 12.09L18 18L13.09 13.74L12 20L10.91 13.74L6 18L9.26 12.09L3 11L9.26 9.91L6 4L10.91 8.26L12 2Z"
              fill="white"
            />
          </svg>
        </div>
        <span className="text-[32px] font-extrabold text-text-primary tracking-tight">
          Oria
        </span>
      </div>

      <h1 className="text-[22px] font-bold text-text-primary text-center tracking-tight mb-3">
        Save more. Move more. Earn more.
      </h1>
      <p className="text-[15px] text-text-secondary text-center leading-relaxed max-w-[300px]">
        Deposit crypto, stay active, and watch your savings grow with higher
        yields for every streak you build.
      </p>

      <div className="w-full mt-12 flex flex-col items-center gap-4">
        <button
          onClick={onNext}
          className="w-full h-[52px] rounded-[14px] gradient-brand text-white font-semibold text-base shadow-button cursor-pointer border-none"
        >
          Get Started
        </button>
        <button
          onClick={onSignIn}
          className="text-[13px] text-purple-400 cursor-pointer bg-transparent border-none hover:text-purple-600 transition-colors"
        >
          Already have an account? Sign in
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Connect Wallet ───
function ConnectWalletStep({
  onNext,
  onBack,
  onSignIn,
  onPrivyName,
}: {
  onNext: () => void;
  onBack: () => void;
  onSignIn: () => void;
  onPrivyName: (name: string) => void;
}) {
  const [loggingIn, setLoggingIn] = useState(false);
  const { getAccessToken } = usePrivy();
  const { login } = useLogin({
    onComplete: async (params) => {
      setLoggingIn(false);
      // Eagerly register token getter so apiFetch can attach Bearer token
      setAuthTokenGetter(() => getAccessToken());
      const walletAddr = params.user.wallet?.address;
      let isNew = true;
      // Create the user record with no displayName / no avatar so the next
      // step (NameStep) is forced to collect one — otherwise we'd silently
      // create accounts called "User" that nobody can search for.
      try {
        const data = await apiFetch("/api/auth/verify", {
          method: "POST",
          body: JSON.stringify({ walletAddr }),
        }) as { isNew?: boolean };
        if (data?.isNew === false) isNew = false;
      } catch {
        // ignore — treat as new user on error
      }
      if (isNew) {
        // Pre-fill the name step with whatever Privy gave us, but the user
        // still has to confirm/edit and submit before continuing.
        onPrivyName(deriveDisplayName(params.user));
        onNext();
      } else {
        // Returning user — skip onboarding steps, go straight to dashboard
        document.cookie = "oria_onboarded=1; path=/; max-age=2592000";
        onSignIn();
      }
    },
    onError: () => {
      setLoggingIn(false);
    },
  });

  const handleLogin = () => {
    setLoggingIn(true);
    login();
  };

  return (
    <div className="flex flex-col min-h-screen px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-md flex items-center justify-center bg-purple-50 border-none cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="mt-6 mb-2">
        <p className="text-xs font-semibold text-purple-600 tracking-widest uppercase mb-2">
          Step 1 of 4
        </p>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Connect Your Wallet
        </h1>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          Sign in securely with Privy. No seed phrase needed.
        </p>
      </div>

      <div className="flex flex-col gap-3 mt-8">
        <button
          onClick={handleLogin}
          disabled={loggingIn}
          className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl gradient-brand text-white shadow-button cursor-pointer border-none min-h-[56px] text-base font-semibold disabled:opacity-50"
        >
          {loggingIn ? "Connecting..." : "Sign in with Privy"}
        </button>
      </div>

      <p className="text-[13px] text-text-muted text-center mt-6 leading-relaxed">
        Sign in with email, Google, or Apple. Privy will create an embedded
        wallet for you automatically.
      </p>

      <div className="mt-auto pt-8">
        <ProgressDots current={1} total={STEPS} />
      </div>
    </div>
  );
}

// ─── Step 3: Choose Your Name (+ optional photo) ───
function ChooseNameStep({
  initialName,
  onNext,
  onBack,
}: {
  initialName: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // If Privy filled it in after mount, pre-populate (but don't overwrite
    // user-typed input).
    if (initialName && !name) setName(initialName);
  }, [initialName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAvatarPick = () => fileInputRef.current?.click();
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) { toast("Image too large (max 500 KB)", "error"); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const trimmed = name.trim();
  const canContinue = trimmed.length >= 2;

  const submit = async () => {
    if (!canContinue || saving) return;
    setSaving(true);
    try {
      await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName: trimmed, avatarUrl }),
      });
      onNext();
    } catch (e) {
      const msg = e instanceof Error && e.message && !e.message.startsWith("API error")
        ? e.message
        : "Couldn't save your name — please retry";
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-md flex items-center justify-center bg-purple-50 border-none cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="mt-6 mb-6">
        <p className="text-xs font-semibold text-purple-600 tracking-widest uppercase mb-2">
          Step 2 of 4
        </p>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Pick a name your friends will recognise
        </h1>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          This is how you&apos;ll show up on leaderboards, challenges and the activity feed.
        </p>
      </div>

      {/* Avatar — silhouette by default, optional upload */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={avatarUrl}
              alt="Profile"
              className="rounded-full object-cover"
              style={{
                width: 100,
                height: 100,
                border: "2px solid #A78BFA",
                boxShadow: "0 4px 16px rgba(139,92,246,0.4)",
              }}
            />
          ) : (
            <div
              className="rounded-full flex items-end justify-center overflow-hidden"
              style={{
                width: 100,
                height: 100,
                background: "linear-gradient(160deg, rgba(167,139,250,0.18), rgba(124,58,237,0.10))",
                border: "2px solid #A78BFA",
                boxShadow: "0 4px 16px rgba(139,92,246,0.4)",
              }}
              aria-label="No profile photo set"
            >
              <svg width={100} height={100} viewBox="0 0 64 64" fill="none" stroke="#E9D5FF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="32" cy="24" r="11" />
                <path d="M11 60c0-11.6 9.4-21 21-21s21 9.4 21 21" />
              </svg>
            </div>
          )}
          <button
            onClick={handleAvatarPick}
            className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full gradient-brand flex items-center justify-center shadow-button border-2 border-[#07070B] cursor-pointer active:scale-90 transition-transform"
            aria-label="Upload profile photo"
            type="button"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
        <button
          type="button"
          onClick={avatarUrl ? () => setAvatarUrl(null) : handleAvatarPick}
          className={`text-[12px] mt-3 cursor-pointer bg-transparent font-semibold ${avatarUrl ? "text-text-muted" : "text-accent-purple-bright"}`}
        >
          {avatarUrl ? "Remove photo" : "Upload a photo (optional)"}
        </button>
      </div>

      {/* Name input */}
      <div>
        <label htmlFor="onb-name" className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 block">
          Display name
        </label>
        <input
          id="onb-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 50))}
          placeholder="Eve, Marco, sarah_k…"
          autoComplete="name"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && canContinue) submit(); }}
          className="w-full px-4 py-3.5 rounded-2xl border border-oria bg-oria-section text-[15px] text-text-primary placeholder:text-text-muted focus:border-accent-purple outline-none"
        />
        <p className="text-[11px] text-text-muted mt-2">
          {trimmed.length < 2
            ? "At least 2 characters so friends can find you."
            : `${trimmed.length}/50`}
        </p>
      </div>

      <div className="mt-8">
        <button
          onClick={submit}
          disabled={!canContinue || saving}
          className="w-full px-5 py-4 rounded-xl gradient-brand text-white shadow-button cursor-pointer border-none min-h-[56px] text-base font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>

      <div className="mt-auto pt-8">
        <ProgressDots current={2} total={STEPS} />
      </div>
    </div>
  );
}

// ─── Step 4: Choose Goal ───
function ChooseGoalStep({
  onNext,
  onBack,
}: {
  onNext: (goalType: string, targetKm: number) => void;
  onBack: () => void;
}) {
  const [goalType, setGoalType] = useState("running");
  const [targetKm, setTargetKm] = useState(10);

  const activities = [
    {
      id: "running",
      label: "Running",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="17" cy="4" r="2" />
          <path d="M15.59 13.51l2.66-2.66a1 1 0 00-1.42-1.42l-3.07 3.07a2 2 0 01-1.41.59H10.5L8 15.5" />
          <path d="M5.11 18.39A2 2 0 107.94 15.56L10.5 13H8l-4.5 4.5" />
          <path d="M17 14v6" />
        </svg>
      ),
    },
    {
      id: "cycling",
      label: "Cycling",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18.5" cy="17.5" r="3.5" />
          <circle cx="5.5" cy="17.5" r="3.5" />
          <circle cx="15" cy="5" r="1" />
          <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
        </svg>
      ),
    },
    {
      id: "steps",
      label: "Steps",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5 10 7 9.33 8.5 8 10" />
          <path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 1.5.67 3 2 4.5" />
        </svg>
      ),
    },
  ];

  const quickTargets = goalType === "cycling" ? [20, 40, 60, 80] : [5, 10, 15, 20];

  return (
    <div className="flex flex-col min-h-screen px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-md flex items-center justify-center bg-purple-50 border-none cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="mt-6 mb-2">
        <p className="text-xs font-semibold text-purple-600 tracking-widest uppercase mb-2">
          Step 3 of 4
        </p>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Set Your Goal
        </h1>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          Choose your activity and weekly target. Hit it each week to grow your
          streak and APY.
        </p>
      </div>

      {/* Activity Type */}
      <div className="mt-8 mb-6">
        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 block">
          Activity type
        </label>
        <div className="flex gap-3">
          {activities.map((a) => (
            <button
              key={a.id}
              onClick={() => setGoalType(a.id)}
              className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 cursor-pointer transition-all min-h-[80px] ${
                goalType === a.id
                  ? "border-purple-600 bg-purple-50 text-purple-600 shadow-[0_0_0_1px_#7c3aed]"
                  : "border-oria bg-white/60 text-text-secondary hover:border-purple-200"
              }`}
            >
              {a.icon}
              <span className="text-[13px] font-semibold">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Target */}
      <div className="mb-6">
        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 block">
          Weekly target
        </label>
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setTargetKm(Math.max(1, targetKm - 1))}
            className="w-12 h-12 rounded-xl bg-purple-50 border border-oria flex items-center justify-center text-purple-600 text-xl font-bold cursor-pointer"
          >
            -
          </button>
          <div className="flex-1 text-center">
            <span className="text-[40px] font-extrabold text-text-primary tabular-nums tracking-tight">
              {targetKm}
            </span>
            <span className="text-lg text-text-muted font-medium ml-1">
              {goalType === "steps" ? "k steps" : "km"}
            </span>
          </div>
          <button
            onClick={() => setTargetKm(targetKm + 1)}
            className="w-12 h-12 rounded-xl bg-purple-50 border border-oria flex items-center justify-center text-purple-600 text-xl font-bold cursor-pointer"
          >
            +
          </button>
        </div>
        <div className="flex gap-2">
          {quickTargets.map((t) => (
            <button
              key={t}
              onClick={() => setTargetKm(t)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                targetKm === t
                  ? "gradient-brand text-white shadow-button"
                  : "bg-purple-50 text-purple-600 border border-oria"
              }`}
            >
              {t} {goalType === "steps" ? "k" : "km"}
            </button>
          ))}
        </div>
      </div>

      {/* Info card */}
      <Card className="!p-4 mt-2">
        <div className="flex gap-3 items-start">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            Start realistic. You can always adjust your target later in
            settings.
          </p>
        </div>
      </Card>

      <div className="mt-auto pt-8 flex flex-col gap-4">
        <button
          onClick={() => onNext(goalType, targetKm)}
          className="w-full h-[52px] rounded-[14px] gradient-brand text-white font-semibold text-base shadow-button cursor-pointer border-none"
        >
          Continue
        </button>
        <ProgressDots current={3} total={STEPS} />
      </div>
    </div>
  );
}

// ─── Step 5: Fund Wallet — show address + QR for the user to receive crypto ───
function FundWalletStep({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { data: wallet } = useWalletBalance();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const addr = wallet?.walletAddr ?? null;
  const short = addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

  const copy = async () => {
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(true);
      toast("Address copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Failed to copy", "error");
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-md flex items-center justify-center bg-purple-50 border-none cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="mt-6 mb-2">
        <p className="text-xs font-semibold text-purple-600 tracking-widest uppercase mb-2">
          Step 4 of 4
        </p>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Fund your Oria wallet
        </h1>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          Scan or copy your address to fund your wallet from any exchange or other wallet. Funds start earning yield as soon as they arrive.
        </p>
      </div>

      {/* QR */}
      <div className="flex justify-center my-6">
        <div className="p-4 bg-white rounded-2xl shadow-card">
          {addr ? (
            <QRCodeSVG value={addr} size={188} level="M" bgColor="#FFFFFF" fgColor="#0B0B11" />
          ) : (
            <div className="w-[188px] h-[188px] flex items-center justify-center text-text-muted text-sm">
              Loading wallet…
            </div>
          )}
        </div>
      </div>

      {/* Address — tap to copy */}
      {addr && (
        <button
          onClick={copy}
          className="w-full mb-4 px-4 py-3 rounded-2xl bg-oria-card border border-oria flex items-center justify-between gap-3 cursor-pointer hover:bg-oria-card-hover transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-accent-purple/15 border border-accent-purple/25 flex items-center justify-center flex-shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z" />
              </svg>
            </div>
            <div className="min-w-0 text-left">
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Your Oria wallet</p>
              <p className="text-[13px] font-mono text-text-primary truncate">{short}</p>
            </div>
          </div>
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-oria-chip border border-oria flex items-center justify-center group-hover:bg-accent-purple/15 transition-colors">
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA0AC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            )}
          </div>
        </button>
      )}

      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-warning-100 border border-warning-500/25">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p className="text-[12px] text-warning-500 leading-relaxed">
          Make sure you&apos;re sending on a supported network. Transfers on unsupported chains may result in loss of funds.
        </p>
      </div>

      <div className="mt-auto pt-6 flex flex-col gap-3">
        <button
          onClick={onNext}
          className="w-full h-[52px] rounded-[14px] gradient-brand text-white font-semibold text-base shadow-button cursor-pointer border-none"
        >
          I&apos;ve sent funds (or do it later)
        </button>
        <ProgressDots current={4} total={STEPS} />
      </div>
    </div>
  );
}

// ─── Main Onboarding Page ───
export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [privyName, setPrivyName] = useState("");
  const [goalType, setGoalType] = useState("running");
  const [targetKm, setTargetKm] = useState(10);
  const router = useRouter();
  const { ready, authenticated } = usePrivy();

  useEffect(() => {
    // Already logged-in user lands on onboarding → skip straight to dashboard
    if (ready && authenticated && step === 0) {
      document.cookie = "oria_onboarded=1; path=/; max-age=2592000";
      router.replace("/dashboard");
    }
  }, [ready, authenticated, step, router]);

  // Wait for Privy SDK to initialize (prevents wagmi store ref crash)
  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  const finish = async () => {
    // Save goal settings (best effort — don't block navigation)
    try {
      await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ goalType, targetKm }),
      });
    } catch {
      // ignore — user can update settings later from profile
    }

    // Set onboarded cookie (expires in 30 days)
    document.cookie = "oria_onboarded=1; path=/; max-age=2592000";

    router.push("/dashboard");
  };

  const goToDashboard = () => router.replace("/dashboard");

  return (
    <>
      {step === 0 && <WelcomeStep onNext={() => setStep(1)} onSignIn={() => setStep(1)} />}
      {step === 1 && (
        <ConnectWalletStep
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
          onSignIn={goToDashboard}
          onPrivyName={setPrivyName}
        />
      )}
      {step === 2 && (
        <ChooseNameStep
          initialName={privyName}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <ChooseGoalStep
          onNext={(gt, tk) => {
            setGoalType(gt);
            setTargetKm(tk);
            setStep(4);
          }}
          onBack={() => setStep(2)}
        />
      )}
      {step === 4 && (
        <FundWalletStep onNext={finish} onBack={() => setStep(3)} />
      )}
    </>
  );
}
