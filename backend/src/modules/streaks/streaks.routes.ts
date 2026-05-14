import type { FastifyInstance } from "fastify";
import {
  logActivitySchema,
  activityQuerySchema,
} from "./streaks.schemas.js";
import {
  logActivity,
  getActivities,
  getMyStreak,
  recoverStreak,
  evaluateStreaks,
  startVacation,
  endVacation,
} from "./streaks.service.js";

export default async function streaksRoutes(app: FastifyInstance) {
  app.post("/activities", async (request, reply) => {
    const body = logActivitySchema.parse(request.body);
    const activity = await logActivity(app.prisma, request.userId, body);
    return reply.status(201).send(activity);
  });

  app.get("/activities", async (request, reply) => {
    const { weeks } = activityQuerySchema.parse(request.query);
    const activities = await getActivities(app.prisma, request.userId, weeks);
    return reply.send(activities);
  });

  app.get("/streaks/me", async (request, reply) => {
    const streak = await getMyStreak(app.prisma, request.userId);
    return reply.send(streak);
  });

  app.post("/streaks/recover", async (request, reply) => {
    const result = await recoverStreak(app.prisma, request.userId);
    return reply.send(result);
  });

  app.post("/streaks/evaluate", async (_request, reply) => {
    const results = await evaluateStreaks(app.prisma);
    return reply.send({ evaluated: results.length, results });
  });

  app.post("/streaks/vacation", async (request, reply) => {
    const result = await startVacation(app.prisma, request.userId);
    return reply.send(result);
  });

  app.delete("/streaks/vacation", async (request, reply) => {
    const result = await endVacation(app.prisma, request.userId);
    return reply.send(result);
  });
}
