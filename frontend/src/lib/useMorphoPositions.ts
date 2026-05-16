"use client";

import { useQuery } from "@tanstack/react-query";
import { VAULTS, getUsdcBalance, getVaultAssets, getVaultShares, fetchVaultApys, type Vault } from "@/lib/morpho";

export interface VaultPosition {
  vault: Vault;
  assets: number;     // USDC equivalent in the vault
  shares: bigint;
  apy: number | null; // net APY in % (null if fetch failed)
}

export interface ChainIdle {
  chainName: string;
  chainKey: "base" | "ethereum";
  usdc: number;
}

export interface MorphoPositionsData {
  positions: VaultPosition[];
  idle: ChainIdle[];        // USDC sitting on the wallet, per chain
  invested: number;         // sum of all vault positions in USDC
  idleTotal: number;        // sum of idle USDC across chains
  total: number;            // invested + idle
  apys: Record<string, number>;
}

const EMPTY: MorphoPositionsData = { positions: [], idle: [], invested: 0, idleTotal: 0, total: 0, apys: {} };

async function fetchAll(walletAddr: string): Promise<MorphoPositionsData> {
  // Fetch APYs once for all vaults
  const apys = await fetchVaultApys();

  // Fetch each vault's position (shares + assets) in parallel
  const positions = await Promise.all(
    VAULTS.map(async (vault): Promise<VaultPosition> => {
      try {
        const [shares, assets] = await Promise.all([
          getVaultShares(vault, walletAddr),
          getVaultAssets(vault, walletAddr),
        ]);
        return { vault, shares, assets, apy: apys[vault.id] ?? null };
      } catch {
        return { vault, shares: 0n, assets: 0, apy: apys[vault.id] ?? null };
      }
    }),
  );

  // Idle USDC per chain (dedupe by chainKey)
  const chainMap = new Map<string, Vault>();
  for (const v of VAULTS) {
    if (!chainMap.has(v.chainKey)) chainMap.set(v.chainKey, v);
  }
  const idle = await Promise.all(
    Array.from(chainMap.values()).map(async (v): Promise<ChainIdle> => {
      try {
        const usdc = await getUsdcBalance(v, walletAddr);
        return { chainName: v.chainName, chainKey: v.chainKey, usdc };
      } catch {
        return { chainName: v.chainName, chainKey: v.chainKey, usdc: 0 };
      }
    }),
  );

  const invested = positions.reduce((sum, p) => sum + p.assets, 0);
  const idleTotal = idle.reduce((sum, c) => sum + c.usdc, 0);
  return { positions, idle, invested, idleTotal, total: invested + idleTotal, apys };
}

export function useMorphoPositions(walletAddr: string | null | undefined) {
  return useQuery<MorphoPositionsData>({
    queryKey: ["morpho-position", walletAddr ?? ""],
    queryFn: () => (walletAddr ? fetchAll(walletAddr) : Promise.resolve(EMPTY)),
    enabled: !!walletAddr,
    staleTime: 60_000, // 1 min cache
    refetchOnWindowFocus: true,
  });
}
