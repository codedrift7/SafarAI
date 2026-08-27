import { loadEnvConfig } from "@next/env";
import { z } from "zod";

// Must run before envSchema.parse(process.env) below, and before any other module that
// reads process.env is imported. This mirrors Next.js's own documented pattern for custom
// servers, and correctly loads .env.local plus .env.development.local / .env.production.local
// depending on NODE_ENV — the same precedence Next itself uses, not just a single flat file.
const dev = process.env.NODE_ENV !== "production";
loadEnvConfig(process.cwd(), dev);

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().default("redis://localhost:6379"),
    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_REFRESH_SECRET: z.string().min(16),
    CLIENT_URL: z.string().default("http://localhost:3000"),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GROQ_API_KEY: z.string().min(1),
    GROQ_API_BASE_URL: z.string().default("https://api.groq.com/openai/v1"),
    GROQ_MODEL_GENERATION: z.string().default("llama-3.3-70b-versatile"),
    GROQ_MODEL_CHAT: z.string().default("llama-3.1-8b-instant"),
  })
  // .env.example documents that the two secrets must differ; that was never actually
  // enforced. If they match, a leaked/guessed access token secret also compromises
  // refresh tokens, collapsing the short-lived/long-lived separation the auth design relies on.
  .refine((val) => val.JWT_ACCESS_SECRET !== val.JWT_REFRESH_SECRET, {
    message: "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values",
    path: ["JWT_REFRESH_SECRET"],
  });

export const env = envSchema.parse(process.env);