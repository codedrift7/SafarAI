"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Mountain, CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Invalid reset link. The link may be malformed or missing the token.
        </div>
        
        <Link
          href="/forgot-password"
          className="inline-flex items-center justify-center gap-2 font-semibold text-attabad-turquoise hover:underline"
        >
          Request a new link
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-green-50 text-green-600">
          <CheckCircle2 size={24} />
        </div>
        
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Your password has been reset.
        </div>
        
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 font-semibold text-attabad-turquoise hover:underline"
        >
          Log in
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || "Failed to reset password. The link might be invalid or expired.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while resetting your password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-karakoram-ink"
        >
          New password
        </label>

        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-karakoram-ink/15 bg-sandstone-mist px-4 py-3 text-sm text-karakoram-ink outline-none transition focus:border-attabad-turquoise focus:ring-2 focus:ring-attabad-turquoise/20"
          placeholder="Min 8 characters"
        />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-2 block text-sm font-medium text-karakoram-ink"
        >
          Confirm password
        </label>

        <input
          id="confirmPassword"
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="w-full rounded-xl border border-karakoram-ink/15 bg-sandstone-mist px-4 py-3 text-sm text-karakoram-ink outline-none transition focus:border-attabad-turquoise focus:ring-2 focus:ring-attabad-turquoise/20"
          placeholder="Confirm new password"
        />
      </div>

      {error && (
        <div className="space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
          <div className="text-center">
            <Link
              href="/forgot-password"
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-attabad-turquoise hover:underline"
            >
              Request a new link
              <ArrowRight size={14} />
            </Link>
          </div>
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
            Resetting...
          </>
        ) : (
          <>
            Reset password
            <ArrowRight size={17} />
          </>
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-[calc(100vh-68px)] bg-sandstone-mist px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-truck-art-marigold text-karakoram-ink">
            <Mountain size={28} strokeWidth={2.2} />
          </div>

          <h1 className="display-type text-4xl text-karakoram-ink">
            Reset password
          </h1>

          <p className="mt-3 text-sm leading-6 text-karakoram-ink/65">
            Enter your new password below.
          </p>
        </div>

        <div className="rounded-2xl border border-karakoram-ink/10 bg-white p-6 shadow-sm sm:p-8">
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin text-attabad-turquoise" size={24} /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
