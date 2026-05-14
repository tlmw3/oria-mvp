import type { PrismaClient } from "@prisma/client";
import { APY, MORPHO_VAULT } from "../../config/constants.js";

interface MorphoVaultState {
  netApy?: number;
  apy?: number;
}

interface MorphoApiResponse {
  data?: {
    vaultByAddress?: {
      state?: MorphoVaultState;
    };
  };
}

const CACHE_KEY = "morpho_vault_apy";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedRate {
  apy: number;
  fetchedAt: string;
}

async function readCache(prisma: PrismaClient): Promise<CachedRate | null> {
  const row = await prisma.systemConfig.findUnique({ where: { key: CACHE_KEY } });
  if (!row) return null;
  const value = row.value as unknown as CachedRate;
  return value;
}

async function writeCache(prisma: PrismaClient, apy: number): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: CACHE_KEY },
    create: { key: CACHE_KEY, value: { apy, fetchedAt: new Date().toISOString() } },
    update: { value: { apy, fetchedAt: new Date().toISOString() } },
  });
}

/// Fetch the Morpho vault APY (Steakhouse Prime USDC on Base).
/// Returns APY as a percentage (e.g. 6.5 for 6.5%).
async function fetchFromMorpho(): Promise<number | null> {
  try {
    const query = `query { vaultByAddress(address: "${MORPHO_VAULT.ADDRESS}", chainId: ${MORPHO_VAULT.CHAIN_ID}) { state { netApy apy } } }`;
    const res = await fetch("https://blue-api.morpho.org/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as MorphoApiResponse;
    const state = json.data?.vaultByAddress?.state;
    const decimal = state?.netApy ?? state?.apy;
    if (typeof decimal !== "number") return null;
    // Morpho returns APY as a decimal (e.g. 0.065 for 6.5%)
    return decimal * 100;
  } catch {
    return null;
  }
}

/// Returns the current Morpho vault APY (in percent).
/// Uses 24h cache; falls back to FALLBACK_VAULT_APY on network errors.
export async function getMorphoApy(prisma: PrismaClient, force = false): Promise<number> {
  if (!force) {
    const cached = await readCache(prisma);
    if (cached) {
      const ageMs = Date.now() - new Date(cached.fetchedAt).getTime();
      if (ageMs < CACHE_TTL_MS) return cached.apy;
    }
  }
  const fresh = await fetchFromMorpho();
  if (fresh !== null) {
    await writeCache(prisma, fresh);
    return fresh;
  }
  // Network failed — return last cached value if any, else fallback
  const cached = await readCache(prisma);
  if (cached) return cached.apy;
  return APY.FALLBACK_VAULT_APY;
}
