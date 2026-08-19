"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Mountain } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [homeCountry, setHomeCountry] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          email,
          password,
          homeCountry: homeCountry || undefined,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.error || `Registration failed: ${response.status}`,
        );
      }

      router.push("/trips");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create your account.",
      );
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
            Start your Safar
          </h1>

          <p className="mt-3 text-sm leading-6 text-karakoram-ink/65">
            Create your account and start planning Pakistan with care.
          </p>
        </div>

        <div className="rounded-2xl border border-karakoram-ink/10 bg-white p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-karakoram-ink"
              >
                Your name
              </label>

              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-karakoram-ink/15 bg-sandstone-mist px-4 py-3 text-sm text-karakoram-ink outline-none transition focus:border-attabad-turquoise focus:ring-2 focus:ring-attabad-turquoise/20"
                placeholder="Your name"
              />
            </div>

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

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-karakoram-ink"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-karakoram-ink/15 bg-sandstone-mist px-4 py-3 text-sm text-karakoram-ink outline-none transition focus:border-attabad-turquoise focus:ring-2 focus:ring-attabad-turquoise/20"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="homeCountry"
                className="mb-2 block text-sm font-medium text-karakoram-ink"
              >
                Home country
                <span className="ml-1 font-normal text-karakoram-ink/45">
                  (optional)
                </span>
              </label>

              <input
                id="homeCountry"
                type="text"
                autoComplete="country-name"
                value={homeCountry}
                onChange={(event) => setHomeCountry(event.target.value)}
                className="w-full rounded-xl border border-karakoram-ink/15 bg-sandstone-mist px-4 py-3 text-sm text-karakoram-ink outline-none transition focus:border-attabad-turquoise focus:ring-2 focus:ring-attabad-turquoise/20"
                placeholder="Pakistan"
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
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-karakoram-ink/60">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-attabad-turquoise hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}