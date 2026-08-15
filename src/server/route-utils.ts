import { z } from "zod";
import { jsonError } from "./http";

export async function parseJson<T>(request: Request, schema: z.ZodSchema<T>): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  try {
    const json = await request.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return {
        ok: false,
        response: jsonError(parsed.error.issues.map((issue) => issue.message).join("; "), 422),
      };
    }
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, response: jsonError("Invalid JSON body", 400) };
  }
}
