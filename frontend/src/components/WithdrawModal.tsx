"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useWallets } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/Toast";
import { getVaultShares, getVaultAssets, redeemFromVault, VAULTS, DEFAULT_VAULT, type Vault } from "@/lib/morpho";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function WithdrawModal({ open, onClose }: Props) {
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [vault, setVault] = useState<Vault>(DEFAULT_VAULT);
  const [positions, setPositions] = useState<Record<string, number>>({}); // assets per vault
  const [amount, setAmount] = useState("");
  const [shares, setShares] = useState<bigint | null>(null);
  const [assets, setAssets] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const loadPosition = useCallback(async (v: Vault) => {
    if (!wallet?.address) return;
    setLoading(true);
    try {
      const [s, a] = await Promise.all([
        getVaultShares(v, wallet.address),
        getVaultAssets(v, wallet.address),
      ]);
      setShares(s);
      setAssets(a);
      setPositions((p) => ({ ...p, [v.id]: a }));
    } catch {
      setShares(0n);
      setAssets(0);
    } finally {
      setLoading(false);
    }
  }, [wallet?.address]);

  const loadAllPositions = useCallback(async () => {
    if (!wallet?.address) return;
    const out: Record<string, number> = {};
    await Promise.all(VAULTS.map(async (v) => {
      try {
        out[v.id] = await getVaultAssets(v, wallet.address);
      } catch {
        out[v.id] = 0;
      }
    }));
    setPositions(out);
  }, [wallet?.address]);

  useEffect(() => {
    if (open) {
      setAmount("");
      setStatus("");
      setTxHash(null);
      loadAllPositions();
      loadPosition(vault);
    }
  }, [open, vault, loadAllPositions, loadPosition]);

  if (!open || !mounted) return null;

  const numAmount = parseFloat(amount || "0");
  const valid = numAmount > 0 && assets !== null && numAmount <= assets && shares !== null && shares > 0n;
  const explorerUrl = txHash ? `${vault.explorerUrl}/${txHash}` : null;

  const submit = async () => {
    if (!wallet || shares === null || assets === null) { toast("Wallet not connected", "error"); return; }
    if (!valid) return;
    setBusy(true);
    try {
      const ratio = numAmount / assets;
      const sharesToRedeem = BigInt(Math.floor(Number(shares) * Math.min(1, ratio)));
      if (sharesToRedeem === 0n) {
        toast("Amount too small", "error");
        setBusy(false);
        return;
      }
      const hash = await redeemFromVault(vault, wallet, sharesToRedeem, setStatus);
      setTxHash(hash);
      setStatus("Success!");
      toast(`Withdrew ${numAmount.toFixed(2)} USDC ✓`);
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["morpho-position"] });
      setTimeout(() => onClose(), 1500);
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      const msg = code === 4001 ? "Cancelled" : (err instanceof Error ? err.message : "Transaction failed");
      setStatus(msg);
      toast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-[420px] bg-[#0F0F16] rounded-t-3xl border-t border-x border-oria p-6 sheet-in max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 16px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-oria-strong mx-auto mb-5" />
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-text-primary">Withdraw from Morpho</h3>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-oria-chip border border-oria flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA0AC" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-[13px] text-text-muted mb-4 leading-relaxed">
          Sélectionne le vault depuis lequel retirer.
        </p>

        {/* Vault picker with position per vault */}
        <div className="flex flex-col gap-2 mb-4">
          {VAULTS.map((v) => {
            const active = v.id === vault.id;
            const pos = positions[v.id];
            const hasPos = pos !== undefined && pos > 0;
            return (
              <button
                key={v.id}
                onClick={() => !busy && setVault(v)}
                disabled={busy}
                className={`flex items-center justify-between text-left px-3 py-3 rounded-2xl border transition-all cursor-pointer disabled:opacity-50 ${
                  active
                    ? "border-accent-purple bg-accent-purple/10 ring-1 ring-accent-purple/40"
                    : "border-oria bg-oria-section hover:bg-oria-elevated"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-text-primary truncate">{v.name}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{v.curator} · {v.chainName}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className={`text-[13px] font-bold tabular-nums ${hasPos ? "text-success-500" : "text-text-muted"}`}>
                    {pos === undefined ? "…" : `$${pos.toFixed(2)}`}
                  </p>
                  <p className="text-[9px] text-text-muted">position</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected vault position */}
        <div className="flex items-center justify-between mb-2 px-3 py-2.5 rounded-xl bg-oria-section border border-oria">
          <span className="text-[12px] text-text-muted">Position on {vault.chainName}</span>
          <button
            onClick={() => assets != null && setAmount(assets.toString())}
            className="text-[14px] font-bold text-text-primary tabular-nums cursor-pointer hover:text-accent-purple-bright"
          >
            {loading ? "…" : assets?.toFixed(2) ?? "—"} USDC
          </button>
        </div>
        <p className="text-[10px] text-text-muted mb-3 text-center">Tap to withdraw max</p>

        <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Amount</label>
        <div className="relative mb-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-text-muted font-medium">$</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={busy}
            className="w-full pl-9 pr-4 py-4 rounded-2xl border border-oria bg-oria-section text-[22px] font-bold text-text-primary placeholder:text-text-muted focus:border-accent-purple outline-none tabular-nums disabled:opacity-60"
          />
        </div>

        {status && (
          <div className={`mb-4 p-3 rounded-xl border text-[12px] ${
            status.toLowerCase().includes("success") ? "bg-success-100 border-success-500/25 text-success-500" :
            status.toLowerCase().includes("cancel") || status.toLowerCase().includes("fail") ? "bg-error-100 border-error-500/25 text-error-500" :
            "bg-accent-purple/10 border-accent-purple/25 text-accent-purple-bright"
          }`}>
            {busy && <span className="inline-block w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2 align-middle" />}
            {status}
            {explorerUrl && <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="ml-2 underline">view tx</a>}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-3.5 rounded-xl border border-oria bg-oria-chip text-text-secondary font-semibold text-sm cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!valid || busy}
            className="flex-1 py-3.5 rounded-xl gradient-brand text-white font-semibold text-sm shadow-button cursor-pointer disabled:opacity-50"
          >
            {busy ? "Processing…" : "Withdraw"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
