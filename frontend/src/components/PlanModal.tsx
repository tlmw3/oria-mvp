"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/Toast";

interface PlanModalProps {
  open: boolean;
  onClose: () => void;
  targetKm: number;
  goalType: string;
  initial: { sessionsPerWeek: number; longRunKm: number };
  onSaved: () => void;
}

function suggestPlan(targetKm: number) {
  if (targetKm <= 5) return { sessionsPerWeek: 2, longRunKm: 3 };
  if (targetKm <= 15) return { sessionsPerWeek: 3, longRunKm: Math.round(targetKm * 0.4 * 10) / 10 };
  if (targetKm <= 30) return { sessionsPerWeek: 4, longRunKm: Math.round(targetKm * 0.35 * 10) / 10 };
  if (targetKm <= 50) return { sessionsPerWeek: 5, longRunKm: Math.round(targetKm * 0.3 * 10) / 10 };
  return { sessionsPerWeek: 6, longRunKm: Math.round(targetKm * 0.28 * 10) / 10 };
}

export function PlanModal({ open, onClose, targetKm, goalType, initial, onSaved }: PlanModalProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState(initial.sessionsPerWeek);
  const [longRun, setLongRun] = useState(initial.longRunKm);
  const [hasLongRun, setHasLongRun] = useState(initial.longRunKm > 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) {
      setSessions(initial.sessionsPerWeek);
      setLongRun(initial.longRunKm);
      setHasLongRun(initial.longRunKm > 0);
    }
  }, [open, initial.sessionsPerWeek, initial.longRunKm]);

  if (!open || !mounted) return null;

  const sessionWord = goalType === "steps" ? "day" : goalType === "cycling" ? "ride" : "run";
  const unit = goalType === "steps" ? "k steps" : "km";
  const effectiveLong = hasLongRun ? longRun : 0;
  const remainingKm = Math.max(0, targetKm - effectiveLong);
  const easyCount = Math.max(0, sessions - (hasLongRun ? 1 : 0));
  const perEasy = easyCount > 0 ? remainingKm / easyCount : 0;

  const applySuggest = () => {
    const s = suggestPlan(targetKm);
    setSessions(s.sessionsPerWeek);
    setLongRun(s.longRunKm);
    setHasLongRun(s.longRunKm > 0);
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          settings: {
            runPlan: { sessionsPerWeek: sessions, longRunKm: hasLongRun ? longRun : 0 },
          },
        }),
      });
      onSaved();
      toast("Plan saved!");
      onClose();
    } catch {
      toast("Failed to save plan", "error");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-[#0F0F16] rounded-t-3xl border-t border-x border-oria p-6 sheet-in max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 16px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-oria-strong mx-auto mb-5" />
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-text-primary">Your weekly plan</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-oria-chip border border-oria flex items-center justify-center cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA0AC" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-[13px] text-text-muted mb-5 leading-relaxed">
          Build the plan that fits you. Goal: <strong className="text-text-primary">{targetKm} {unit}/week</strong>.
        </p>

        {/* Suggest button */}
        <button
          onClick={applySuggest}
          className="w-full mb-5 px-4 py-3 rounded-2xl bg-accent-purple/10 border border-accent-purple/25 text-accent-purple-bright text-[13px] font-semibold cursor-pointer hover:bg-accent-purple/15 transition-colors flex items-center justify-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Suggest from my {targetKm}{unit === "km" ? "km" : "k"} goal
        </button>

        {/* Sessions per week */}
        <label className="text-[12px] font-medium text-text-secondary mb-2 block">{sessionWord}s per week</label>
        <div className="grid grid-cols-7 gap-1.5 mb-5">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              onClick={() => setSessions(n)}
              className={`py-3 rounded-xl text-[13px] font-semibold cursor-pointer transition-colors border ${
                sessions === n
                  ? "gradient-brand text-white border-transparent shadow-button"
                  : "bg-oria-chip text-text-secondary border-oria hover:bg-oria-elevated"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Long run toggle + km */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[12px] font-medium text-text-secondary">Include a long {sessionWord}?</label>
            <button
              type="button"
              onClick={() => setHasLongRun((v) => !v)}
              className="cursor-pointer"
              aria-pressed={hasLongRun}
            >
              <div className={`relative w-[44px] h-[26px] rounded-full transition-colors ${hasLongRun ? "bg-accent-purple" : "bg-oria-strong"}`}>
                <div className={`absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-transform ${hasLongRun ? "translate-x-[21px]" : "translate-x-[3px]"}`} />
              </div>
            </button>
          </div>
          {hasLongRun && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLongRun((v) => Math.max(1, Math.round((v - 1) * 10) / 10))}
                className="w-10 h-10 rounded-xl bg-oria-chip border border-oria flex items-center justify-center cursor-pointer text-text-primary text-lg font-bold"
              >−</button>
              <div className="flex-1 px-4 py-3 rounded-xl border border-oria bg-oria-section text-center">
                <span className="text-xl font-extrabold text-text-primary tabular-nums">{longRun}</span>
                <span className="text-sm text-text-muted font-medium ml-1">{unit}</span>
              </div>
              <button
                onClick={() => setLongRun((v) => Math.round((v + 1) * 10) / 10)}
                className="w-10 h-10 rounded-xl bg-oria-chip border border-oria flex items-center justify-center cursor-pointer text-text-primary text-lg font-bold"
              >+</button>
            </div>
          )}
        </div>

        {/* Breakdown preview */}
        <div className="p-4 rounded-2xl bg-oria-section border border-oria mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-3">Preview</p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[13px]">
              <span className="text-text-secondary">{sessions} {sessionWord}{sessions > 1 ? "s" : ""} per week</span>
            </div>
            {hasLongRun && (
              <div className="flex justify-between text-[13px]">
                <span className="text-text-secondary">1 long {sessionWord}</span>
                <span className="font-semibold text-text-primary tabular-nums">{longRun} {unit}</span>
              </div>
            )}
            {easyCount > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-text-secondary">{easyCount} easy {sessionWord}{easyCount > 1 ? "s" : ""}</span>
                <span className="font-semibold text-text-primary tabular-nums">~{perEasy.toFixed(1)} {unit} each</span>
              </div>
            )}
            <div className="border-t border-oria pt-2 mt-1 flex justify-between text-[13px]">
              <span className="font-semibold text-text-primary">Weekly total</span>
              <span className="font-bold text-accent-purple-bright tabular-nums">{(effectiveLong + perEasy * easyCount).toFixed(1)} {unit}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl border border-oria bg-oria-chip text-text-secondary font-semibold text-sm cursor-pointer min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-3.5 rounded-xl gradient-brand text-white font-semibold text-sm shadow-button cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            {saving ? "Saving…" : "Save plan"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
