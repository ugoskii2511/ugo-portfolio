"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, LogIn } from "lucide-react";

function safeRedirectTarget(target: string | undefined): string {
  if (target && target.startsWith("/admin") && !target.startsWith("//")) {
    return target;
  }
  return "/admin";
}

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Invalid email or password");
      }

      router.push(safeRedirectTarget(redirectTo));
      router.refresh();
    } catch (error) {
      setIsSubmitting(false);
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <div className="glass-panel w-full max-w-sm rounded-2xl p-8">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white">
          <Lock className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Admin Login</h1>
          <p className="mt-1 text-sm text-foreground/60">Sign in to manage your site</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Email</span>
          <input
            required
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Password</span>
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 outline-none ring-primary/40 transition focus:ring-2"
          />
        </label>

        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-medium text-white shadow-lg shadow-primary/30 transition hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          Sign In
        </button>
      </form>
    </div>
  );
}
