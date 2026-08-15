import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  CLIENT_URL: z.string().default("http://localhost:3000"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_API_BASE_URL: z.string().default("https://api.groq.com/openai/v1"),
  GROQ_MODEL_GENERATION: z.string().default("llama-3.3-70b-versatile"),
  GROQ_MODEL_CHAT: z.string().default("llama-3.1-8b-instant"),
});

export const env = envSchema.parse(process.env);
