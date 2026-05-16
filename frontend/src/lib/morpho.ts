import type { ConnectedWallet } from "@privy-io/react-auth";

export interface Vault {
  id: string;
  name: string;
  symbol: string;
  curator: string;
  address: string;
  chainId: number;
  chainName: string;
  chainKey: "base" | "ethereum";
  rpcUrl: string;
  explorerUrl: string;
  usdcAddress: string;
  usdcDecimals: number;
}

export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const USDC_ETH = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
export const USDC_DECIMALS = 6;

const BASE_RPC = "https://mainnet.base.org";
const ETH_RPC = "https://eth.llamarpc.com";

export const VAULTS: readonly Vault[] = [
  {
    id: "steakhouse-prime-usdc-base",
    name: "Steakhouse Prime USDC",
    symbol: "steakUSDC",
    curator: "Steakhouse",
    address: "0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2",
    chainId: 8453,
    chainName: "Base",
    chainKey: "base",
    rpcUrl: BASE_RPC,
    explorerUrl: "https://basescan.org/tx",
    usdcAddress: USDC_BASE,
    usdcDecimals: USDC_DECIMALS,
  },
  {
    id: "gauntlet-usdc-prime-base",
    name: "Gauntlet USDC Prime",
    symbol: "gtUSDCp",
    curator: "Gauntlet",
    address: "0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61",
    chainId: 8453,
    chainName: "Base",
    chainKey: "base",
    rpcUrl: BASE_RPC,
    explorerUrl: "https://basescan.org/tx",
    usdcAddress: USDC_BASE,
    usdcDecimals: USDC_DECIMALS,
  },
  {
    id: "gauntlet-usdc-frontier-ethereum",
    name: "Gauntlet USDC Frontier",
    symbol: "gtusdcf",
    curator: "Gauntlet",
    address: "0xc582F04d8a82795aa2Ff9c8bb4c1c889fe7b754e",
    chainId: 1,
    chainName: "Ethereum",
    chainKey: "ethereum",
    rpcUrl: ETH_RPC,
    explorerUrl: "https://etherscan.io/tx",
    usdcAddress: USDC_ETH,
    usdcDecimals: USDC_DECIMALS,
  },
] as const;

export const DEFAULT_VAULT = VAULTS[0];

const SEL = {
  balanceOf:        "0x70a08231",
  allowance:        "0xdd62ed3e",
  approve:          "0x095ea7b3",
  deposit:          "0x6e553f65",
  redeem:           "0xba087652",
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

async function rpcCall(rpcUrl: string, to: string, data: string): Promise<bigint> {
  const res = await fetch(rpcUrl, {
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

export async function getUsdcBalance(vault: Vault, walletAddr: string): Promise<number> {
  const raw = await rpcCall(vault.rpcUrl, vault.usdcAddress, SEL.balanceOf + addr(walletAddr));
  return formatUnits(raw, vault.usdcDecimals);
}

export async function getVaultShares(vault: Vault, walletAddr: string): Promise<bigint> {
  return rpcCall(vault.rpcUrl, vault.address, SEL.balanceOf + addr(walletAddr));
}

export async function getVaultAssets(vault: Vault, walletAddr: string): Promise<number> {
  const shares = await getVaultShares(vault, walletAddr);
  if (shares === 0n) return 0;
  const assets = await rpcCall(vault.rpcUrl, vault.address, SEL.convertToAssets + uint(shares));
  return formatUnits(assets, vault.usdcDecimals);
}

export async function getAllowance(vault: Vault, walletAddr: string): Promise<bigint> {
  return rpcCall(vault.rpcUrl, vault.usdcAddress, SEL.allowance + addr(walletAddr) + addr(vault.address));
}

async function ensureChain(wallet: ConnectedWallet, chainId: number): Promise<void> {
  await wallet.switchChain(chainId);
}

async function sendTx(wallet: ConnectedWallet, to: string, data: string): Promise<string> {
  const provider = await wallet.getEthereumProvider();
  const txHash = await provider.request({
    method: "eth_sendTransaction",
    params: [{ from: wallet.address, to, data }],
  });
  return txHash as string;
}

async function waitForTx(rpcUrl: string, hash: string): Promise<boolean> {
  for (let i = 0; i < 60; i++) {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [hash],
      }),
    });
    const json = await res.json();
    if (json.result) return json.result.status === "0x1";
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

export interface DepositResult { steps: { label: string; hash: string }[]; finalHash: string }

export async function approveAndDeposit(
  vault: Vault,
  wallet: ConnectedWallet,
  amountUsdc: number,
  onProgress: (step: string) => void,
): Promise<DepositResult> {
  await ensureChain(wallet, vault.chainId);
  const amountRaw = parseUnits(amountUsdc, vault.usdcDecimals);
  const steps: { label: string; hash: string }[] = [];

  const current = await getAllowance(vault, wallet.address);
  if (current < amountRaw) {
    onProgress("Approving USDC…");
    const approveData = SEL.approve + addr(vault.address) + uint(amountRaw);
    const approveHash = await sendTx(wallet, vault.usdcAddress, approveData);
    steps.push({ label: "Approve", hash: approveHash });
    onProgress("Waiting for approve confirmation…");
    const ok = await waitForTx(vault.rpcUrl, approveHash);
    if (!ok) throw new Error("Approve transaction failed");
  }

  onProgress("Depositing into vault…");
  const depositData = SEL.deposit + uint(amountRaw) + addr(wallet.address);
  const depositHash = await sendTx(wallet, vault.address, depositData);
  steps.push({ label: "Deposit", hash: depositHash });
  onProgress("Waiting for deposit confirmation…");
  const ok = await waitForTx(vault.rpcUrl, depositHash);
  if (!ok) throw new Error("Deposit transaction failed");
  return { steps, finalHash: depositHash };
}

export async function redeemFromVault(
  vault: Vault,
  wallet: ConnectedWallet,
  shares: bigint,
  onProgress: (step: string) => void,
): Promise<string> {
  await ensureChain(wallet, vault.chainId);
  onProgress("Redeeming shares…");
  const data = SEL.redeem + uint(shares) + addr(wallet.address) + addr(wallet.address);
  const hash = await sendTx(wallet, vault.address, data);
  onProgress("Waiting for confirmation…");
  const ok = await waitForTx(vault.rpcUrl, hash);
  if (!ok) throw new Error("Redeem transaction failed");
  return hash;
}

export interface VaultLiveData { netApy: number; totalAssets: number }

export async function fetchVaultApys(): Promise<Record<string, number>> {
  const query = `{
    ${VAULTS.map((v, i) => `v${i}: vaultByAddress(address: "${v.address}", chainId: ${v.chainId}) { state { netApy } }`).join("\n")}
  }`;
  try {
    const res = await fetch("https://blue-api.morpho.org/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const json = await res.json();
    const out: Record<string, number> = {};
    VAULTS.forEach((v, i) => {
      const apy = json.data?.[`v${i}`]?.state?.netApy;
      if (typeof apy === "number") out[v.id] = apy * 100;
    });
    return out;
  } catch {
    return {};
  }
}
