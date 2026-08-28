"use client";

import { useState } from "react";
import { Mail, X, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export function EmailVerificationBanner() {
  const auth = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("safar_verify_banner_dismissed") === "1";
  });
  const [resendState, setResendState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  // Don't render while loading, if not logged in, if already verified, or if dismissed
  if (auth.loading || !auth.user || auth.user.emailVerified || dismissed) {
    return null;
  }

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem("safar_verify_banner_dismissed", "1");
  }

  async function handleResend() {
    setResendState("sending");
    try {
      const res = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setResendState("sent");
      } else {
        const body = await res.json().catch(() => null);
        console.error("[banner] resend failed:", body?.error);
        setResendState("error");
      }
    } catch {
      setResendState("error");
    }
  }

  return (
    <div className="border-b border-truck-art-marigold/30 bg-truck-art-marigold/15 px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-karakoram-ink">
          <Mail size={16} className="shrink-0 text-truck-art-marigold" />
          <span>
            Please verify your email address. Check your inbox for a
            verification link.
          </span>

          {resendState === "idle" && (
            <button
              type="button"
              onClick={handleResend}
              className="shrink-0 font-semibold text-attabad-turquoise hover:underline"
            >
              Resend email
            </button>
          )}

          {resendState === "sending" && (
            <span className="flex shrink-0 items-center gap-1.5 text-karakoram-ink/60">
              <Loader2 size={14} className="animate-spin" />
              Sending…
            </span>
          )}

          {resendState === "sent" && (
            <span className="flex shrink-0 items-center gap-1.5 font-medium text-meadow">
              <CheckCircle2 size={14} />
              Sent!
            </span>
          )}

          {resendState === "error" && (
            <button
              type="button"
              onClick={handleResend}
              className="shrink-0 font-semibold text-alert-red hover:underline"
            >
              Failed — try again
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1 text-karakoram-ink/50 transition hover:bg-karakoram-ink/10 hover:text-karakoram-ink"
          aria-label="Dismiss verification banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
