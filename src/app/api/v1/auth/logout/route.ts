import { clearAuthCookies } from "@/server/auth";
import { jsonOk } from "@/server/http";

export async function POST() {
  const response = jsonOk({ ok: true });
  clearAuthCookies(response);
  return response;
}
