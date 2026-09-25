"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { buttonClass } from "@/components/site/button";
import { Field } from "@/components/admin/ui";

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
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

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

      const data = await response.json().catch(() => null);

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-describedby={errorMessage ? errorId : undefined}>
      <Field label="Email" htmlFor={emailId}>
        <input
          id={emailId}
          required
          type="email"
          autoComplete="username"
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="field"
          aria-invalid={Boolean(errorMessage)}
        />
      </Field>

      <Field label="Password" htmlFor={passwordId}>
        <div className="relative">
          <input
            id={passwordId}
            required
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field !pr-12"
            aria-invalid={Boolean(errorMessage)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-faint transition hover:text-fg"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      {errorMessage && (
        <p id={errorId} role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          {errorMessage}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} className={buttonClass("primary", "md", "mt-1 w-full")}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
