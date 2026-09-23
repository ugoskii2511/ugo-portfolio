"use client";

import { useId, useState } from "react";
import { clsx } from "clsx";
import { Plus } from "lucide-react";

export type FaqEntry = { id: string; question: string; answer: string };

export function FaqSection({ faqs }: { faqs: FaqEntry[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();

  return (
    <ul className="border-t border-line">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;
        const panelId = `${baseId}-${index}`;
        return (
          <li key={faq.id} className="border-b border-line">
            <h3>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="group flex min-h-11 w-full items-center justify-between gap-6 py-6 text-left"
              >
                <span
                  className={clsx(
                    "text-lg font-medium tracking-tight transition-colors sm:text-xl",
                    isOpen ? "text-fg" : "text-fg/75 group-hover:text-fg"
                  )}
                >
                  {faq.question}
                </span>
                <Plus
                  aria-hidden
                  className={clsx(
                    "h-4 w-4 shrink-0 transition-transform duration-500",
                    isOpen ? "rotate-45 text-accent-bright" : "text-muted"
                  )}
                />
              </button>
            </h3>
            <div
              id={panelId}
              inert={!isOpen}
              className={clsx(
                "grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <p className="max-w-2xl pb-7 text-pretty leading-relaxed text-muted">{faq.answer}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
