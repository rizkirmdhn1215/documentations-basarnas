import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./lib/env";
import { prisma } from "./lib/prisma";
import { v1Routes } from "./routes/v1";

async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: config.CORS_ORIGIN.split(",").map((item) => item.trim()),
  });

  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  await app.register(async (v1) => {
    await v1Routes(v1);
  }, { prefix: "/v1" });

  app.setErrorHandler((error, _req, reply) => {
    app.log.error(error);
    reply.code(500).send({ error: "Internal server error" });
  });

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  return app;
}

async function start() {
  const app = await buildServer();
  await app.listen({ port: config.PORT, host: "0.0.0.0" });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
