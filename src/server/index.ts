import crypto from "crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import next from "next";
import { env } from "./env";

async function bootstrap() {
  const dev = env.NODE_ENV !== "production";
  const app = next({
    dev,
    dir: process.cwd(),
    hostname: "localhost",
    port: env.PORT,
  });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = express();
  server.use(helmet());
  server.use(cors({ origin: env.CLIENT_URL, credentials: true }));

  server.use((req, res, nextMiddleware) => {
  const nonce = crypto.randomBytes(16).toString("base64");

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "script-src-attr 'none'",
    "style-src 'self' https: 'unsafe-inline'",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' https: data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

    // Make the CSP available to Next.js while it renders.
    req.headers["content-security-policy"] = csp;
    req.headers["x-nonce"] = nonce;

    // Also send the same policy to the browser.
    res.setHeader("Content-Security-Policy", csp);

    nextMiddleware();
  });

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