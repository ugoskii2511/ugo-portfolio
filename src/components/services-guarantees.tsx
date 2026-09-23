import { Code2, LifeBuoy, ReceiptText, Timer } from "lucide-react";

const GUARANTEES = [
  { icon: ReceiptText, label: "Fixed, upfront pricing" },
  { icon: Timer, label: "Clear project timeline" },
  { icon: Code2, label: "You own the source code" },
  { icon: LifeBuoy, label: "Post-launch support" },
];

export function ServicesGuarantees() {
  return (
    <ul className="grid grid-cols-2 border-l border-t border-line lg:grid-cols-4">
      {GUARANTEES.map((item) => (
        <li
          key={item.label}
          className="flex items-center gap-3 border-b border-r border-line px-4 py-5 text-sm text-fg/85 sm:px-5"
        >
          <item.icon className="h-4 w-4 shrink-0 text-accent-bright" aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
