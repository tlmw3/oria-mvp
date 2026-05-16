"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string | null | undefined;
  displayName?: string | null;
}

export function ReferFriendsModal({ open, onClose, userId, displayName }: Props) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanShare(true);
    }
  }, []);

  if (!open || !mounted) return null;

  const inviteUrl = userId
    ? `https://oriamvp.cloud/?ref=${userId.slice(0, 8)}`
    : "https://oriamvp.cloud";
  const fromLabel = displayName ? `${displayName} ` : "";
  const shareText = `${fromLabel}t'invite sur Oria : gagne plus d'APY en restant régulier sur ton sport. ${inviteUrl}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Échec de la copie", "error");
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({
        title: "Oria",
        text: shareText,
        url: inviteUrl,
      });
    } catch {
      // user cancelled or share failed — silent
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-[#0F0F16] rounded-t-3xl border-t border-x border-oria p-6 sheet-in"
        style={{ paddingBottom: "calc(28px + env(safe-area-inset-bottom, 16px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-oria-strong mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-text-primary">Invite tes amis</h3>
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

        {/* Hero */}
        <div className="mt-3 mb-5 p-4 rounded-2xl bg-accent-purple/10 border border-accent-purple/25">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full gradient-brand flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 11l-3 3-3-3M19 14V4" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-text-primary">Ton cercle, ton APY</p>
              <p className="text-[12px] text-text-secondary leading-snug mt-0.5">
                Plus tu es entouré, plus tu restes consistant — et plus ton bonus monte.
              </p>
            </div>
          </div>
        </div>

        {/* Invite link */}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">
          Ton lien d&apos;invitation
        </p>
        <button
          onClick={copyLink}
          className="w-full mb-3 px-4 py-3 rounded-2xl bg-oria-section border border-oria flex items-center justify-between gap-3 cursor-pointer hover:bg-oria-elevated transition-colors group"
        >
          <span className="text-[13px] font-mono text-text-primary truncate text-left flex-1">
            {inviteUrl}
          </span>
          <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-oria-chip border border-oria flex items-center justify-center">
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
          </span>
        </button>

        {/* Share buttons */}
        {canShare ? (
          <button
            onClick={nativeShare}
            className="w-full py-3.5 rounded-xl gradient-brand text-white font-semibold text-sm shadow-button cursor-pointer flex items-center justify-center gap-2 mb-3"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Partager
          </button>
        ) : (
          <button
            onClick={copyLink}
            className="w-full py-3.5 rounded-xl gradient-brand text-white font-semibold text-sm shadow-button cursor-pointer mb-3"
          >
            {copied ? "Lien copié ✓" : "Copier le lien"}
          </button>
        )}

        {/* Quick channels (fallback if no native share) */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 rounded-xl border border-oria bg-oria-section text-center text-[12px] font-semibold text-text-secondary cursor-pointer hover:bg-oria-elevated"
          >
            WhatsApp
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 rounded-xl border border-oria bg-oria-section text-center text-[12px] font-semibold text-text-secondary cursor-pointer hover:bg-oria-elevated"
          >
            Telegram
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent("Rejoins-moi sur Oria")}&body=${encodeURIComponent(shareText)}`}
            className="py-2.5 rounded-xl border border-oria bg-oria-section text-center text-[12px] font-semibold text-text-secondary cursor-pointer hover:bg-oria-elevated"
          >
            Email
          </a>
        </div>

        <p className="text-[11px] text-text-muted text-center leading-relaxed">
          Chaque ami que tu fais rejoindre devient un partenaire de consistance — vous vous tirez vers le haut, votre cercle alimente votre régularité.
        </p>
      </div>
    </div>,
    document.body,
  );
}
