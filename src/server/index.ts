import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import next from "next";
import { env } from "./env";

async function bootstrap() {
  const dev = env.NODE_ENV !== "production";
  const app = next({ dev, dir: process.cwd() });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = express();
  server.use(helmet());
  server.use(cors({ origin: env.CLIENT_URL, credentials: true }));

  server.all("*", (req, res) => {
    return handle(req, res);
  });

  server.listen(env.PORT, () => {
    console.log(`SafarAI server listening on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
