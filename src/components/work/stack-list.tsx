import { clsx } from "clsx";

export function StackList({ stack, className }: { stack: string[]; className?: string }) {
  return (
    <ul className={clsx("flex flex-wrap gap-1.5", className)} aria-label="Technology">
      {stack.map((tech) => (
        <li
          key={tech}
          className="rounded-md border border-line bg-white/[0.025] px-2 py-1 font-mono text-[0.68rem] text-muted"
        >
          {tech}
        </li>
      ))}
    </ul>
  );
}
