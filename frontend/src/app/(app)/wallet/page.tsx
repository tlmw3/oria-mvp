"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/Card";
import { QuickAction } from "@/components/QuickAction";
import { CardSkeleton, ErrorCard } from "@/components/Skeleton";
import { useEarnings, useWalletBalance, useDeposits, useUser } from "@/lib/hooks";
import { useMorphoPositions } from "@/lib/useMorphoPositions";
import { ReceiveSheet } from "@/components/ReceiveSheet";
import { InvestModal } from "@/components/InvestModal";
import { WithdrawModal } from "@/components/WithdrawModal";
import { useToast } from "@/components/Toast";
import { timeAgo, formatMoney } from "@/lib/utils";

interface Deposit {
  id: string;
  amount: number;
  token: string;
  status: string;
  createdAt: string;
}

function groupByDate(deposits: Deposit[]) {
  const now = Date.now();
  const day = 86400_000;
  const groups: Record<string, Deposit[]> = { Today: [], "This week": [], Earlier: [] };
  for (const d of deposits) {
    const age = now - new Date(d.createdAt).getTime();
    if (age < day) groups["Today"].push(d);
    else if (age < 7 * day) groups["This week"].push(d);
    else groups["Earlier"].push(d);
  }
  return groups;
}

export default function WalletPage() {
  const { data: earnings, isLoading, isError, refetch } = useEarnings();
  const { data: wallet } = useWalletBalance();
  const { data: deposits } = useDeposits();
  const { data: user } = useUser();
  const { data: morpho, isLoading: morphoLoading, refetch: refetchMorpho } = useMorphoPositions(wallet?.walletAddr);
  const currency = user?.settings?.currency ?? "USD";

  const [showDeposit, setShowDeposit] = useState(false);
  const [showInvest, setShowInvest] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const grouped = useMemo(() => groupByDate(deposits ?? []), [deposits]);

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

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        <div className="pt-1 pb-2">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Wallet</h1>
        </div>
        <ErrorCard onRetry={refetch} />
      </div>
    );
  }

  // Real on-chain values from Morpho (idle USDC + invested in vaults)
  // Fallback to backend earnings while on-chain reads are loading or unavailable
  const invested = morpho?.invested ?? earnings?.totalDeposited ?? 0;
  const idleTotal = morpho?.idleTotal ?? 0;
  const totalBalance = morpho?.total ?? (invested + idleTotal);
  const earned = earnings?.totalEarned ?? 0;
  const apy = earnings?.currentApy ?? 4.0;

  // Weighted APY across all vault positions (only over invested portion)
  const weightedApy = morpho && morpho.invested > 0
    ? morpho.positions.reduce((sum, p) => sum + (p.apy ?? 0) * p.assets, 0) / morpho.invested
    : null;

  const bal = formatMoney(totalBalance, currency);
  const earnedFmt = formatMoney(earned, currency);
  const intWithCommas = bal.intPart;
  const decPart = bal.decPart;

  return (
    <div className="flex flex-col gap-5">
      {/* Balance Hero — glassmorphism */}
      <section
        className="pt-5 pb-5 text-center rounded-2xl border border-white/[0.06] relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, rgba(139,92,246,0.10) 0%, rgba(255,255,255,0.03) 50%, rgba(245,158,11,0.06) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        {/* Top shimmer line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <p className="text-[12px] font-semibold uppercase tracking-wider text-text-muted">
          Total balance
        </p>
        <div className="mt-3 flex items-baseline justify-center">
          <span className="text-[18px] text-text-muted font-medium mr-1 mt-2">{bal.symbol}</span>
          <span className="text-[52px] font-extrabold text-text-primary leading-none tracking-tight tabular-nums">
            {intWithCommas}
          </span>
          <span className="text-[22px] text-text-muted font-bold tabular-nums ml-0.5">
            .{decPart}
          </span>
        </div>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-100/80 border border-success-500/20 backdrop-blur-sm">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
          <span className="text-[13px] text-success-500 font-semibold tabular-nums">
            +{earnedFmt.symbol}{earnedFmt.intPart}.{earnedFmt.decPart} earned · {apy.toFixed(2)}% APY
          </span>
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-4 gap-2">
        <QuickAction
          label="Deposit"
          tint="gold"
          onClick={() => setShowDeposit(true)}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
        />
        <QuickAction
          label="Invest"
          tint="sport"
          onClick={() => setShowInvest(true)}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          }
        />
        <QuickAction
          label="Withdraw"
          tint="neutral"
          onClick={() => setShowWithdraw(true)}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          }
        />
        <QuickAction
          label="Activity"
          tint="purple"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          }
          onClick={() => {
            const el = document.getElementById("wallet-tx");
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      </section>

      {/* Receive bottom-sheet — address + QR */}
      <ReceiveSheet open={showDeposit} onClose={() => setShowDeposit(false)} walletAddr={wallet?.walletAddr} />
      <InvestModal open={showInvest} onClose={() => setShowInvest(false)} />
      <WithdrawModal open={showWithdraw} onClose={() => setShowWithdraw(false)} />

      {/* Earning status — aggregated across all vaults */}
      <Card>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-text-primary tracking-tight">Earning status</p>
            <p className="text-[12px] text-text-muted mt-0.5">Across Morpho vaults · live on-chain</p>
          </div>
          <div
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
              invested > 0
                ? "bg-success-100 text-success-500 border-success-500/25"
                : "bg-oria-chip text-text-muted border-oria"
            }`}
          >
            {invested > 0 ? "Active" : "Inactive"}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5 mt-5">
          {(() => {
            const invFmt = formatMoney(invested, currency);
            const eFmt = formatMoney(earned, currency);
            const apyValue = weightedApy !== null ? weightedApy : apy;
            return [
              { label: "Invested", value: `${invFmt.symbol}${invFmt.intPart}.${invFmt.decPart}`, color: "text-text-primary" },
              { label: "Earned",   value: `${eFmt.symbol}${eFmt.intPart}.${eFmt.decPart}`,        color: "text-success-500" },
              { label: "Avg APY",  value: `${apyValue.toFixed(2)}%`,                              color: "text-accent-purple-bright" },
            ];
          })().map((s) => (
            <div key={s.label} className="text-center py-3 rounded-xl bg-oria-section border border-oria">
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{s.label}</p>
              <p className={`text-[17px] font-extrabold ${s.color} mt-1 tabular-nums`}>{s.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Positions per vault — live on-chain */}
      {morpho && (morpho.positions.some(p => p.assets > 0) || morphoLoading) && (
        <Card>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-bold text-text-primary tracking-tight">Your positions</p>
            <button
              onClick={() => refetchMorpho()}
              aria-label="Refresh"
              className="text-[11px] text-accent-purple-bright font-semibold cursor-pointer"
            >
              ↻ Refresh
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {morpho.positions.filter(p => p.assets > 0).length === 0 ? (
              <p className="text-[12px] text-text-muted py-2 text-center">
                {morphoLoading ? "Loading…" : "No positions yet. Tap Invest to start earning."}
              </p>
            ) : morpho.positions.filter(p => p.assets > 0).map((p) => {
              const f = formatMoney(p.assets, currency);
              return (
                <div key={p.vault.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-oria-section border border-oria">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-text-primary truncate">{p.vault.name}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {p.vault.curator} · {p.vault.chainName} {p.apy !== null && `· ${p.apy.toFixed(2)}% APY`}
                    </p>
                  </div>
                  <p className="text-[14px] font-extrabold text-text-primary tabular-nums ml-2">
                    {f.symbol}{f.intPart}.{f.decPart}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Idle USDC per chain */}
      {morpho && morpho.idle.some(c => c.usdc > 0) && (
        <Card>
          <p className="text-sm font-bold text-text-primary mb-3 tracking-tight">Idle USDC</p>
          <div className="flex flex-col">
            {morpho.idle.filter(c => c.usdc > 0).map((c) => {
              const f = formatMoney(c.usdc, currency);
              return (
                <div key={c.chainKey} className="flex justify-between py-2.5 border-b border-oria last:border-b-0">
                  <span className="text-sm text-text-secondary">USDC on {c.chainName}</span>
                  <span className="text-sm font-bold text-text-primary tabular-nums">
                    {f.symbol}{f.intPart}.{f.decPart}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-text-muted mt-3">
            Not earning yield yet — tap Invest to deploy into a Morpho vault.
          </p>
        </Card>
      )}

      {/* Transactions (grouped) */}
      <Card id="wallet-tx" className="!p-0 overflow-hidden">
        <div className="p-5 pb-3">
          <p className="text-sm font-bold text-text-primary tracking-tight">Recent transactions</p>
        </div>
        {deposits && deposits.length > 0 ? (
          <div className="px-5 pb-4">
            {(["Today", "This week", "Earlier"] as const).map((group) =>
              grouped[group].length > 0 ? (
                <div key={group} className="mb-2 last:mb-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted py-2">
                    {group}
                  </p>
                  {grouped[group].map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between py-2.5 border-t border-oria first:border-t-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent-gold/15 border border-accent-gold/25 flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <polyline points="19 12 12 19 5 12" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-text-primary">Deposit</p>
                          <p className="text-[11px] text-text-muted">{timeAgo(d.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-bold text-text-primary tabular-nums">
                          +{d.amount.toLocaleString()} {d.token}
                        </p>
                        <p className={`text-[11px] font-medium ${d.status === "earning" ? "text-success-500" : "text-warning-500"}`}>
                          {d.status === "earning" ? "Earning" : "Confirmed"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null
            )}
          </div>
        ) : (
          <div className="text-center py-10 px-5">
            <div className="w-12 h-12 rounded-2xl bg-accent-gold/15 border border-accent-gold/25 flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-text-primary mb-1">No transactions yet</p>
            <p className="text-[12px] text-text-muted">Make your first deposit to start earning</p>
          </div>
        )}
      </Card>

      {/* Wallet address — copy */}
      {wallet?.walletAddr && (
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(wallet.walletAddr!);
              setCopied(true);
              toast("Address copied!");
              setTimeout(() => setCopied(false), 2000);
            } catch {
              toast("Failed to copy", "error");
            }
          }}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-oria-card border border-oria cursor-pointer hover:bg-oria-card-hover transition-colors group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Wallet</span>
            <span className="text-[12px] text-text-secondary font-mono truncate">
              {wallet.walletAddr.slice(0, 6)}…{wallet.walletAddr.slice(-4)}
            </span>
          </div>
          <span className="flex-shrink-0">
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64697A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-accent-purple-bright transition-colors">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            )}
          </span>
        </button>
      )}
    </div>
  );
}
