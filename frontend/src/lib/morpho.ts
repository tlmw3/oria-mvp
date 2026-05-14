import type { ConnectedWallet } from "@privy-io/react-auth";

export const BASE_CHAIN_ID = 8453;
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const USDC_DECIMALS = 6;
export const VAULT_ADDR = "0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2";
const BASE_RPC = "https://mainnet.base.org";

// Function selectors (keccak256 first 4 bytes)
const SEL = {
  balanceOf:        "0x70a08231",
  allowance:        "0xdd62ed3e",
  approve:          "0x095ea7b3",
  deposit:          "0x6e553f65", // deposit(uint256 assets, address receiver)
  redeem:           "0xba087652", // redeem(uint256 shares, address receiver, address owner)
  convertToAssets:  "0x07a2d13a",
};

function padHex(hex: string): string { return hex.padStart(64, "0"); }
function addr(a: string): string { return padHex(a.toLowerCase().replace(/^0x/, "")); }
function uint(v: bigint): string { return padHex(v.toString(16)); }

export function parseUnits(amount: number, decimals: number): bigint {
  const [whole = "0", frac = ""] = String(amount).split(".");
  const fracPadded = frac.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + fracPadded);
}

export function formatUnits(raw: bigint, decimals: number): number {
  const s = raw.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals);
  const frac = s.slice(-decimals);
  return parseFloat(whole + "." + frac);
}

async function rpcCall(to: string, data: string): Promise<bigint> {
  const res = await fetch(BASE_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return BigInt(json.result);
}

export async function getUsdcBalance(walletAddr: string): Promise<number> {
  const raw = await rpcCall(USDC_BASE, SEL.balanceOf + addr(walletAddr));
  return formatUnits(raw, USDC_DECIMALS);
}

export async function getVaultShares(walletAddr: string): Promise<bigint> {
  return rpcCall(VAULT_ADDR, SEL.balanceOf + addr(walletAddr));
}

export async function getVaultAssets(walletAddr: string): Promise<number> {
  const shares = await getVaultShares(walletAddr);
  if (shares === 0n) return 0;
  const assets = await rpcCall(VAULT_ADDR, SEL.convertToAssets + uint(shares));
  return formatUnits(assets, USDC_DECIMALS);
}

export async function getAllowance(walletAddr: string): Promise<bigint> {
  return rpcCall(USDC_BASE, SEL.allowance + addr(walletAddr) + addr(VAULT_ADDR));
}

async function ensureBase(wallet: ConnectedWallet): Promise<void> {
  await wallet.switchChain(BASE_CHAIN_ID);
}

async function sendTx(wallet: ConnectedWallet, to: string, data: string): Promise<string> {
  const provider = await wallet.getEthereumProvider();
  const txHash = await provider.request({
    method: "eth_sendTransaction",
    params: [{ from: wallet.address, to, data }],
  });
  return txHash as string;
}

async function waitForTx(hash: string): Promise<boolean> {
  for (let i = 0; i < 60; i++) {
    const res = await fetch(BASE_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [hash],
      }),
    });
    const json = await res.json();
    if (json.result) {
      return json.result.status === "0x1";
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

export interface TxStep {
  label: string;
  hash?: string;
}

export interface DepositResult {
  steps: TxStep[];
  finalHash: string;
}

export async function approveAndDeposit(
  wallet: ConnectedWallet,
  amountUsdc: number,
  onProgress: (step: string) => void,
): Promise<DepositResult> {
  await ensureBase(wallet);

  const amountRaw = parseUnits(amountUsdc, USDC_DECIMALS);
  const steps: TxStep[] = [];

  // 1. Check current allowance
  const current = await getAllowance(wallet.address);
  if (current < amountRaw) {
    onProgress("Approving USDC…");
    const approveData = SEL.approve + addr(VAULT_ADDR) + uint(amountRaw);
    const approveHash = await sendTx(wallet, USDC_BASE, approveData);
    steps.push({ label: "Approve", hash: approveHash });
    onProgress("Waiting for approve confirmation…");
    const ok = await waitForTx(approveHash);
    if (!ok) throw new Error("Approve transaction failed");
  }

  // 2. Deposit
  onProgress("Depositing into vault…");
  const depositData = SEL.deposit + uint(amountRaw) + addr(wallet.address);
  const depositHash = await sendTx(wallet, VAULT_ADDR, depositData);
  steps.push({ label: "Deposit", hash: depositHash });
  onProgress("Waiting for deposit confirmation…");
  const ok = await waitForTx(depositHash);
  if (!ok) throw new Error("Deposit transaction failed");
  return { steps, finalHash: depositHash };
}

export async function redeemFromVault(
  wallet: ConnectedWallet,
  shares: bigint,
  onProgress: (step: string) => void,
): Promise<string> {
  await ensureBase(wallet);
  onProgress("Redeeming shares…");
  const data = SEL.redeem + uint(shares) + addr(wallet.address) + addr(wallet.address);
  const hash = await sendTx(wallet, VAULT_ADDR, data);
  onProgress("Waiting for confirmation…");
  const ok = await waitForTx(hash);
  if (!ok) throw new Error("Redeem transaction failed");
  return hash;
}
