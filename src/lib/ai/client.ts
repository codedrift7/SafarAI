import OpenAI from "openai";
import { env } from "@/server/env";

const globalStore = globalThis as unknown as { groqClient?: OpenAI };

export const groqClient =
  globalStore.groqClient ??
  new OpenAI({
    apiKey: env.GROQ_API_KEY,
    baseURL: env.GROQ_API_BASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalStore.groqClient = groqClient;
}
