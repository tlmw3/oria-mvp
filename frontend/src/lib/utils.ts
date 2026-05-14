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
