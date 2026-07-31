import { Code2, LifeBuoy, ReceiptText, Timer } from "lucide-react";

const GUARANTEES = [
  { icon: ReceiptText, label: "Fixed, upfront pricing" },
  { icon: Timer, label: "Clear project timeline" },
  { icon: Code2, label: "Full source code ownership" },
  { icon: LifeBuoy, label: "Post-launch support" },
];

export function ServicesGuarantees() {
  return (
    <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3">
      {GUARANTEES.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2 text-sm text-foreground/70">
          <item.icon className="h-4 w-4 text-primary" />
          {item.label}
        </span>
      ))}
    </div>
  );
}
