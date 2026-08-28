"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, Mountain, XCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const auth = useAuth();
  
  const [loading, setLoading] = useState(!!token);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(token ? "" : "Invalid link");
  
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  
  const didVerify = useRef(false);

  useEffect(() => {
    if (!token || didVerify.current) return;
    didVerify.current = true;

    async function verifyToken(t: string) {
      try {
        const response = await fetch("/api/v1/auth/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: t }),
        });

        const body = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(body?.error || "Verification failed");
        }

        setSuccess(true);
        auth.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to verify email.");
      } finally {
        setLoading(false);
      }
    }

    verifyToken(token);
  }, [token, auth]);

  async function handleResend() {
    setResending(true);
    setError("");
    try {
      const response = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || "Failed to resend verification email");
      }

      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend email.");
    } finally {
      setResending(false);
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
            Email Verification
          </h1>

          <p className="mt-3 text-sm leading-6 text-karakoram-ink/65">
            {loading
              ? "Verifying your email..."
              : success
                ? "Verification complete."
                : "Unable to verify email."}
          </p>
        </div>

        <div className="rounded-2xl border border-karakoram-ink/10 bg-white p-6 shadow-sm sm:p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-6">
              <Loader2 className="animate-spin text-attabad-turquoise" size={32} />
              <p className="text-sm text-karakoram-ink/60">Please wait while we verify your email address.</p>
            </div>
          ) : success ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex gap-3 text-sm text-green-700">
                <CheckCircle2 className="shrink-0 text-green-600" size={20} />
                <p>Your email has been verified!</p>
              </div>
              <Link
                href="/trips"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-truck-art-marigold px-4 py-3 text-sm font-semibold text-karakoram-ink transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue to your trips
                <ArrowRight size={17} />
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex gap-3 text-sm text-red-700">
                  <XCircle className="shrink-0 text-red-600" size={20} />
                  <p>{error}</p>
                </div>
              )}

              {resent && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex gap-3 text-sm text-green-700">
                  <CheckCircle2 className="shrink-0 text-green-600" size={20} />
                  <p>A new verification link has been sent to your email.</p>
                </div>
              )}

              {auth.user ? (
                <button
                  onClick={handleResend}
                  disabled={resending || resent}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-truck-art-marigold px-4 py-3 text-sm font-semibold text-karakoram-ink transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resending ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Sending...
                    </>
                  ) : resent ? (
                    "Email sent"
                  ) : (
                    "Resend verification email"
                  )}
                </button>
              ) : (
                <Link
                  href="/login?redirect=/verify-email"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-truck-art-marigold px-4 py-3 text-sm font-semibold text-karakoram-ink transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Log in to request a new verification link
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function LoadingFallback() {
  return (
    <main className="min-h-[calc(100vh-68px)] bg-sandstone-mist px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-truck-art-marigold text-karakoram-ink">
            <Mountain size={28} strokeWidth={2.2} />
          </div>
          <h1 className="display-type text-4xl text-karakoram-ink">
            Email Verification
          </h1>
        </div>
        <div className="rounded-2xl border border-karakoram-ink/10 bg-white p-6 shadow-sm sm:p-8 flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-attabad-turquoise" size={32} />
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
