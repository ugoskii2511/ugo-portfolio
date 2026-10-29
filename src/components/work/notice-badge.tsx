import { Clock } from "lucide-react";
import type { ProjectNotice } from "@/lib/projects";

/// Short label for a temporary listing (cards and the homepage feature).
export function NoticeBadge({ notice }: { notice: ProjectNotice }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300">
      <Clock aria-hidden className="h-3.5 w-3.5" />
      {notice.label}
    </span>
  );
}

/// The full explanation, shown on the case study.
export function NoticeCallout({ notice }: { notice: ProjectNotice }) {
  return (
    <div role="note" className="flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] p-4 text-sm leading-relaxed sm:p-5">
      <Clock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      <p>
        <span className="font-medium text-amber-200">{notice.label}.</span> <span className="text-fg/85">{notice.text}</span>
      </p>
    </div>
  );
}
