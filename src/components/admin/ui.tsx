import { clsx } from "clsx";
import { Search } from "lucide-react";
import type { ComponentPropsWithoutRef, ElementType, HTMLAttributes, ReactNode } from "react";

/// Admin UI kit. Every piece is built from the same tokens as the public
/// site (canvas/raised/line/fg/muted/accent in globals.css) so the control
/// center reads as part of the same product.

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="label-mono">{eyebrow}</p>}
        <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  children,
  className,
  as = "section",
  ...rest
}: { children: ReactNode; className?: string; as?: "section" | "div" | "article" | "li" } & Omit<
  HTMLAttributes<HTMLElement>,
  "className" | "children"
>) {
  const Tag = as as ElementType;
  return (
    <Tag className={clsx("rounded-2xl border border-line bg-raised", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function PanelHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  count,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  /// [current, max] for a live character counter.
  count?: [number, number];
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[0.8rem] font-medium text-fg/90">
          {label}
        </label>
        {count && (
          <span
            className={clsx("font-mono text-[0.65rem] tabular-nums", count[0] > count[1] * 0.9 ? "text-amber-300" : "text-faint")}
            aria-hidden
          >
            {count[0]}/{count[1]}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs leading-relaxed text-faint">{hint}</p>
      )}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
  id,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  /// Accessible name when there's no visible <label htmlFor>.
  label?: string;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-300 disabled:opacity-50",
        checked ? "border-accent bg-accent" : "border-line-strong bg-white/[0.06]"
      )}
    >
      <span
        aria-hidden
        className={clsx(
          "h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          checked ? "translate-x-[22px]" : "translate-x-[3px]"
        )}
      />
    </button>
  );
}

const TONES = {
  neutral: "border-line-strong bg-white/[0.04] text-muted",
  accent: "border-accent/40 bg-accent-soft text-accent-bright",
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  danger: "border-red-400/30 bg-red-400/10 text-red-300",
} as const;
export type Tone = keyof typeof TONES;

export function StatusPill({ tone = "neutral", children, dot = true }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.7rem] font-medium leading-5",
        TONES[tone]
      )}
    >
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative isolate overflow-hidden rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
      <div aria-hidden className="blueprint-grid absolute inset-0 -z-10 opacity-60" />
      {icon && (
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-line-strong bg-raised-2 text-muted">
          {icon}
        </div>
      )}
      <p className="mt-4 font-medium tracking-tight">{title}</p>
      {description && <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function IconButton({
  label,
  children,
  tone = "default",
  className,
  ...rest
}: { label: string; children: ReactNode; tone?: "default" | "danger" } & Omit<
  ComponentPropsWithoutRef<"button">,
  "aria-label" | "children"
>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors disabled:pointer-events-none disabled:opacity-40",
        tone === "danger"
          ? "hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300"
          : "hover:border-line-strong hover:bg-white/[0.05] hover:text-fg",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={clsx("relative", className)}>
      <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="field !rounded-full !py-2 !pl-10"
      />
    </div>
  );
}

/// Segmented filter control (tabs that filter a list in place).
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full flex-wrap gap-1 rounded-full border border-line bg-white/[0.02] p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={clsx(
              "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
              active ? "bg-white/[0.09] text-fg" : "text-muted hover:text-fg"
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={clsx("font-mono text-[0.65rem] tabular-nums", active ? "text-accent-bright" : "text-faint")}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx("animate-pulse rounded-lg bg-white/[0.05]", className)} />;
}

/// toLocaleString (not toLocaleDateString, which throws on timeStyle) so
/// callers can ask for date-only or date + time.
export function formatDate(iso: string, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return new Date(iso).toLocaleString("en-US", options);
}

/// "3h ago", "2d ago", falling back to a short date after a week.
export function formatRelative(iso: string, now = Date.now()) {
  const diff = now - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso, { month: "short", day: "numeric" });
}
