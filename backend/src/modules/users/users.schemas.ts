import { z } from "zod";

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().max(500_000).nullable().optional(),
  goalType: z.enum(["running", "cycling", "steps"]).optional(),
  targetKm: z.number().min(1).max(200).optional(),
  runSchedule: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  settings: z.object({
    notifRunReminders: z.boolean().optional(),
    notifPokes: z.boolean().optional(),
    notifFriendRequests: z.boolean().optional(),
    notifWeeklySummary: z.boolean().optional(),
    privacyShowOnLeaderboard: z.boolean().optional(),
    privacyShowActivityToFriends: z.boolean().optional(),
    unitsKm: z.boolean().optional(),
    currency: z.enum(["USD", "EUR"]).optional(),
    /// Monthly progressive overload in percent (0 = maintenance, no target bump)
    monthlyProgressionPct: z.number().int().min(0).max(20).optional(),
    /// User-defined weekly running plan
    runPlan: z.object({
      sessionsPerWeek: z.number().int().min(1).max(7),
      longRunKm: z.number().min(0).max(50),
    }).optional(),
  }).optional(),
});

export type UpdateUserBody = z.infer<typeof updateUserSchema>;
