"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, Mountain, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const body = await response.json().catch(() => null);

      if (response.status === 429) {
        throw new Error(body?.error || "Too many requests. Please try again later.");
      }

      // Show success for any other response to prevent account enumeration
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-68px)] bg-sandstone-mist px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-truck-art-marigold text-karakoram-ink">
            <Mountain size={28} strokeWidth={2.2} />
          </div>

          <h1 className="display-type text-4xl text-karakoram-ink">
            Forgot password
          </h1>

          <p className="mt-3 text-sm leading-6 text-karakoram-ink/65">
            Enter your email to receive a password reset link.
          </p>
        </div>

        <div className="rounded-2xl border border-karakoram-ink/10 bg-white p-6 shadow-sm sm:p-8">
          {sent ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-green-50 text-green-600">
                <CheckCircle2 size={24} />
              </div>
              
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                If an account exists for that email, we&apos;ve sent a password reset link. Check your inbox.
              </div>
              
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 font-semibold text-attabad-turquoise hover:underline"
              >
                <ArrowLeft size={16} />
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-karakoram-ink"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-karakoram-ink/15 bg-sandstone-mist px-4 py-3 text-sm text-karakoram-ink outline-none transition focus:border-attabad-turquoise focus:ring-2 focus:ring-attabad-turquoise/20"
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-truck-art-marigold px-4 py-3 text-sm font-semibold text-karakoram-ink transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Sending link...
                  </>
                ) : (
                  <>
                    Send reset link
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

              <div className="mt-4 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-attabad-turquoise hover:underline"
                >
                  <ArrowLeft size={14} />
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
