import type { FastifyInstance } from "fastify";
import { createChallengeSchema } from "./challenges.schemas.js";
import {
  createChallenge,
  listChallenges,
  joinChallenge,
  getChallengeDetails,
  deleteChallenge,
} from "./challenges.service.js";

export default async function challengesRoutes(app: FastifyInstance) {
  app.post("/challenges", async (request, reply) => {
    const body = createChallengeSchema.parse(request.body);
    const challenge = await createChallenge(
      app.prisma,
      request.userId,
      body,
    );
    return reply.status(201).send(challenge);
  });

  app.get("/challenges", async (request, reply) => {
    const challenges = await listChallenges(app.prisma, request.userId);
    return reply.send(challenges);
  });

  app.post("/challenges/:id/join", async (request, reply) => {
    const { id } = request.params as { id: string };
    const member = await joinChallenge(app.prisma, request.userId, id);
    return reply.status(201).send(member);
  });

  app.get("/challenges/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const challenge = await getChallengeDetails(app.prisma, id);
    return reply.send(challenge);
  });

  app.delete("/challenges/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await deleteChallenge(app.prisma, request.userId, id);
    return reply.send(result);
  });
}
