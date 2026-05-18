// Static USD→EUR rate. Live rates would need a daily-cached fetch.
export const EUR_PER_USD = 0.92;

export type Currency = "USD" | "EUR";

export function formatMoney(amountUsd: number, currency: Currency = "USD"): { symbol: string; intPart: string; decPart: string } {
  const value = currency === "EUR" ? amountUsd * EUR_PER_USD : amountUsd;
  const [intRaw, decRaw = "00"] = value.toFixed(2).split(".");
  return {
    symbol: currency === "EUR" ? "€" : "$",
    intPart: Number(intRaw).toLocaleString(),
    decPart: decRaw,
  };
}

export function currencySymbol(currency: Currency = "USD"): string {
  return currency === "EUR" ? "€" : "$";
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function getInitials(name: string | null): string {
  if (!name) return "??";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const EVENT_CONFIG: Record<string, { verb: string; emoji: string }> = {
  streak_milestone: { verb: "hit a {streakCount}-week streak", emoji: "🏆" },
  goal_met: { verb: "completed {distanceKm} km this week", emoji: "🏃" },
  streak_lost: { verb: "lost their {previousCount}-week streak", emoji: "😢" },
  deposit: { verb: "deposited {amount} {token}", emoji: "💰" },
  challenge_joined: { verb: 'joined "{title}"', emoji: "🤝" },
  challenge_completed: { verb: 'completed "{title}"', emoji: "🎉" },
};

export function formatFeedEvent(
  eventType: string,
  payload: Record<string, unknown>,
): { text: string; emoji: string } {
  const config = EVENT_CONFIG[eventType] ?? { verb: eventType, emoji: "📌" };
  let text = config.verb;
  for (const [key, value] of Object.entries(payload)) {
    text = text.replace(`{${key}}`, String(value));
  }
  return { text, emoji: config.emoji };
}

export function daysUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  if (days <= 0) return "ended";
  return `${days} days`;
}

function getWeekStartUtc(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/// Fill the last `n` ISO weeks using the supplied activities. Returned in the
/// same order as the API's useActivities call: newest first. Missing weeks
/// come back with distanceKm = 0 / goalMet = false so charts can show "the
/// user did 0 km this week" instead of silently skipping the gap.
export function lastNWeeks(
  activities: { weekStart: string; distanceKm: number; goalMet?: boolean }[],
  n: number,
): { weekStart: string; distanceKm: number; goalMet: boolean }[] {
  const currentWeek = getWeekStartUtc(new Date());
  const byWeek = new Map<string, { distanceKm: number; goalMet: boolean }>();
  for (const a of activities) {
    const key = getWeekStartUtc(new Date(a.weekStart)).toISOString().slice(0, 10);
    byWeek.set(key, { distanceKm: a.distanceKm, goalMet: a.goalMet ?? false });
  }
  const out: { weekStart: string; distanceKm: number; goalMet: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(currentWeek);
    d.setUTCDate(d.getUTCDate() - i * 7);
    const key = d.toISOString().slice(0, 10);
    const hit = byWeek.get(key);
    out.push({
      weekStart: d.toISOString(),
      distanceKm: hit?.distanceKm ?? 0,
      goalMet: hit?.goalMet ?? false,
    });
  }
  return out;
}

/// Sum activities by calendar month and return the last `n` consecutive
/// months, oldest first (so it slots directly into left-to-right charts).
/// Missing months come back with 0 km.
export function lastNMonths(
  activities: { weekStart: string; distanceKm: number }[],
  n: number,
): { year: number; month: number; distanceKm: number }[] {
  const byMonth = new Map<string, number>();
  for (const a of activities) {
    const d = new Date(a.weekStart);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth()).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + a.distanceKm);
  }
  const now = new Date();
  const out: { year: number; month: number; distanceKm: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth()).padStart(2, "0")}`;
    out.push({
      year: d.getUTCFullYear(),
      month: d.getUTCMonth(),
      distanceKm: byMonth.get(key) ?? 0,
    });
  }
  return out;
}
