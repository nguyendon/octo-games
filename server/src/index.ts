import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import type { HealthResponse } from "@octo/shared";
import { registerProfileRoutes } from "./routes/profile";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = Fastify({ logger: true });

app.get("/api/health", async (): Promise<HealthResponse> => ({ status: "ok" }));

registerProfileRoutes(app);

if (process.env.NODE_ENV === "production") {
  const fastifyStatic = await import("@fastify/static");
  await app.register(fastifyStatic.default, {
    root: path.resolve(__dirname, "../public"),
    prefix: "/",
  });
}

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
