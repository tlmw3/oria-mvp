"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/components/Toast";

interface ReceiveSheetProps {
  open: boolean;
  onClose: () => void;
  walletAddr: string | null | undefined;
}

export function ReceiveSheet({ open, onClose, walletAddr }: ReceiveSheetProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  const copy = async () => {
    if (!walletAddr) return;
    try {
      await navigator.clipboard.writeText(walletAddr);
      setCopied(true);
      toast("Address copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Failed to copy", "error");
    }
  };

  const short = walletAddr ? `${walletAddr.slice(0, 6)}…${walletAddr.slice(-4)}` : "";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-t-3xl p-6 sheet-in border-t border-x border-white/[0.08] relative"
        style={{
          background:
            "linear-gradient(160deg, rgba(139,92,246,0.12) 0%, rgba(15,15,22,0.96) 40%, rgba(15,15,22,0.99) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
          paddingBottom: "calc(28px + env(safe-area-inset-bottom, 16px))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-purple/40 to-transparent" />
        <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-5" />

        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-text-primary">Receive crypto</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center cursor-pointer hover:bg-white/[0.1] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA0AC" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-[13px] text-text-muted mb-5 leading-relaxed">
          Send crypto to your Oria wallet from any exchange or other wallet.
        </p>

        {/* QR */}
        <div className="flex justify-center mb-5">
          <div className="p-4 bg-white rounded-2xl shadow-card">
            {walletAddr ? (
              <QRCodeSVG value={walletAddr} size={184} level="M" bgColor="#FFFFFF" fgColor="#0B0B11" />
            ) : (
              <div className="w-[184px] h-[184px] flex items-center justify-center text-text-muted text-sm">
                No wallet yet
              </div>
            )}
          </div>
        </div>

        {/* Address — tap to copy */}
        {walletAddr && (
          <button
            onClick={copy}
            className="w-full mb-4 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.07] transition-colors group"
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
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center group-hover:bg-accent-purple/15 transition-colors">
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

        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-warning-100 border border-warning-500/25 mb-5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-[12px] text-warning-500 leading-relaxed">
            Make sure you&apos;re sending on a supported network. Transfers on unsupported chains may
            result in loss of funds.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-xl gradient-brand text-white font-semibold text-sm shadow-button cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>,
    document.body,
  );
}
