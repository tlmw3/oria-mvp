import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { MOCK_USER_ID, MOCK_PRIVY_ID, AGENT_USER_ID, AGENT_PRIVY_ID } from "../config/constants.js";
import { timingSafeEqual } from "node:crypto";
import { UnauthorizedError } from "../lib/errors.js";
import { computeApy } from "../modules/streaks/apy.utils.js";

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorateRequest("userId", "");
  fastify.decorateRequest("privyId", "");

  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    // Skip auth for health check, cron routes, and VAPID key
    if (request.url === "/health" || request.url.startsWith("/api/cron/") || request.url === "/api/push/vapid-key") return;

    if (env.MOCK_AUTH) {
      request.userId = MOCK_USER_ID;
      request.privyId = MOCK_PRIVY_ID;
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing or invalid authorization header");
    }

    const token = authHeader.slice(7);

    if (env.DEV_AGENT_TOKEN && token.length === env.DEV_AGENT_TOKEN.length) {
      const a = Buffer.from(token);
      const b = Buffer.from(env.DEV_AGENT_TOKEN);
      if (timingSafeEqual(a, b)) {
        request.userId = AGENT_USER_ID;
        request.privyId = AGENT_PRIVY_ID;
        return;
      }
    }

    try {
      const { PrivyClient } = await import("@privy-io/server-auth");
      const privy = new PrivyClient(env.PRIVY_APP_ID, env.PRIVY_APP_SECRET);
      const verified = await privy.verifyAuthToken(token);
      request.privyId = verified.userId;

      // Look up internal user ID, auto-create if first login
      let user = await fastify.prisma.user.findUnique({
        where: { privyId: verified.userId },
        select: { id: true },
      });
      if (!user) {
        user = await fastify.prisma.user.create({
          data: {
            privyId: verified.userId,
            streak: {
              create: {
                currentCount: 0,
                longestCount: 0,
                lastWeekMet: false,
                currentApy: computeApy(0),
              },
            },
          },
          select: { id: true },
        });
      }
      request.userId = user.id;
    } catch {
      throw new UnauthorizedError("Invalid or expired token");
    }
  });
});

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
    privyId: string;
  }
}
