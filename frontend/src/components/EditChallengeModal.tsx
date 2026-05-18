"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/Toast";
import { useUpdateChallenge, type ChallengeDetail } from "@/lib/hooks";

interface Props {
  open: boolean;
  onClose: () => void;
  challenge: ChallengeDetail;
}

export function EditChallengeModal({ open, onClose, challenge }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [title, setTitle] = useState(challenge.title);
  const [description, setDescription] = useState(challenge.description ?? "");
  const [bannerUrl, setBannerUrl] = useState<string | null>(challenge.bannerUrl);
  const [goalKmWeek, setGoalKmWeek] = useState(String(challenge.goalKmWeek));
  const [maxMembers, setMaxMembers] = useState(challenge.maxMembers ? String(challenge.maxMembers) : "");

  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const update = useUpdateChallenge();

  useEffect(() => {
    if (open) {
      setTitle(challenge.title);
      setDescription(challenge.description ?? "");
      setBannerUrl(challenge.bannerUrl);
      setGoalKmWeek(String(challenge.goalKmWeek));
      setMaxMembers(challenge.maxMembers ? String(challenge.maxMembers) : "");
    }
  }, [open, challenge]);

  const handleBannerPick = () => fileRef.current?.click();
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      toast("Image too large (max 500 KB)", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setBannerUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const save = () => {
    const km = parseFloat(goalKmWeek);
    if (!title.trim()) { toast("Title is required", "error"); return; }
    if (Number.isNaN(km) || km <= 0) { toast("Weekly goal must be > 0", "error"); return; }
    update.mutate(
      {
        id: challenge.id,
        title: title.trim(),
        description: description.trim() || null,
        bannerUrl,
        goalKmWeek: km,
        maxMembers: maxMembers ? parseInt(maxMembers) : null,
      },
      {
        onSuccess: () => { toast("Challenge updated"); onClose(); },
        onError: () => toast("Failed to update", "error"),
      },
    );
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-[#0F0F16] rounded-t-3xl border-t border-x border-oria p-6 sheet-in max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-oria-strong mx-auto mb-5" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-text-primary">Edit challenge</h3>
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

        {/* Banner */}
        <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Banner</label>
        <button
          type="button"
          onClick={handleBannerPick}
          className="relative w-full h-32 rounded-2xl border border-dashed border-oria bg-oria-section overflow-hidden cursor-pointer mb-4 group"
        >
          {bannerUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bannerUrl} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[12px] font-semibold text-white">Replace image</span>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-text-muted">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="text-[12px] font-medium">Upload a banner</span>
              <span className="text-[10px]">JPG / PNG · max 500 KB</span>
            </div>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBannerChange}
        />
        {bannerUrl && (
          <button
            type="button"
            onClick={() => setBannerUrl(null)}
            className="text-[11px] text-text-muted hover:text-error-500 mb-4 -mt-2 transition-colors"
          >
            Remove banner
          </button>
        )}

        <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3.5 rounded-2xl border border-oria bg-oria-section text-[15px] text-text-primary placeholder:text-text-muted focus:border-accent-purple outline-none mb-4"
        />

        <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this challenge about?"
          rows={3}
          className="w-full px-4 py-3 rounded-2xl border border-oria bg-oria-section text-[15px] text-text-primary placeholder:text-text-muted focus:border-accent-purple outline-none mb-4 resize-none"
        />

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Goal (km/week)</label>
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              value={goalKmWeek}
              onChange={(e) => setGoalKmWeek(e.target.value)}
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

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl border border-oria bg-oria-chip text-text-secondary font-semibold text-sm min-h-[44px] cursor-pointer"
          >
            Cancel
          </button>
          <button
            disabled={update.isPending}
            onClick={save}
            className="flex-1 py-3.5 rounded-xl gradient-brand text-white font-semibold text-sm shadow-button disabled:opacity-50 min-h-[44px]"
          >
            {update.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
