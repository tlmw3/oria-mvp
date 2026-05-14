import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string(),
  PRIVY_APP_ID: z.string().default(""),
  PRIVY_APP_SECRET: z.string().default(""),
  AVAX_RPC_URL: z.string().default("https://api.avax-test.network/ext/bc/C/rpc"),
  AVAX_CHAIN_ID: z.coerce.number().default(43113),
  MOCK_AUTH: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  MOCK_STRAVA: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  STRAVA_CLIENT_ID: z.string().optional(),
  STRAVA_CLIENT_SECRET: z.string().optional(),
  STRAVA_REDIRECT_URI: z.string().optional(),
  MOCK_YIELD: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  CRON_SECRET: z.string().default("oria-cron-secret-2026"),
  DEV_AGENT_TOKEN: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
});

export const env = envSchema.parse(process.env);
