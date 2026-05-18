import { z } from "zod";

export const createChallengeSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  goalKmWeek: z.number().min(1).max(200),
  startDate: z.string(),
  endDate: z.string(),
  maxMembers: z.number().min(2).max(100).optional(),
});

export type CreateChallengeBody = z.infer<typeof createChallengeSchema>;

// Owner-editable fields. Banner is a base64 data URL (or null to remove);
// same cap as user avatars (~500 KB).
export const updateChallengeSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  bannerUrl: z.string().max(700_000).nullable().optional(),
  goalKmWeek: z.number().min(1).max(200).optional(),
  maxMembers: z.number().min(2).max(100).nullable().optional(),
});

export type UpdateChallengeBody = z.infer<typeof updateChallengeSchema>;
