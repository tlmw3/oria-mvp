import { z } from "zod";

export const verifyBodySchema = z.object({
  walletAddr: z.string().optional(),
  displayName: z.string().optional(),
  avatarUrl: z.string().max(700_000).nullable().optional(),
});

export type VerifyBody = z.infer<typeof verifyBodySchema>;
