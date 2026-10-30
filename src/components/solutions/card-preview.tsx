import { Mail, MessageCircle, Nfc, Phone, QrCode, UserPlus } from "lucide-react";

/// Design preview of a smart business card and the profile it opens. It is
/// only a picture of the layout: it doesn't encode a real QR code or NFC tag.
export function CardPreview({ name, title, business, cardType }: { name?: string; title?: string; business?: string; cardType?: string }) {
  const displayName = name?.trim() || "Your Name";
  const displayTitle = title?.trim() || "Your title";
  const displayBusiness = business?.trim() || "Your Business";
  const showNfc = cardType === "nfc-card" || cardType === "qr-nfc";
  const showQr = cardType !== "nfc-card";
  return (
    <figure className="edge relative rounded-2xl p-5">
      <figcaption className="label-mono">Design preview</figcaption>
      <div className="mt-4 aspect-[1.75/1] rounded-xl bg-gradient-to-br from-[#10204a] to-[#0a0f1e] p-4 text-white shadow-[0_20px_40px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/10">
        <div className="flex h-full items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[0.95rem] font-semibold">{displayName}</p>
            <p className="truncate text-[0.7rem] text-white/70">{displayTitle}</p>
            <p className="mt-2 truncate text-[0.65rem] uppercase tracking-[0.18em] text-sky-300">{displayBusiness}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5 text-white/80">
            {showNfc && <Nfc className="h-5 w-5" aria-label="NFC" />}
            {showQr && (
              <span className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-[#0a0f1e]">
                <QrCode className="h-9 w-9" aria-label="QR code" />
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-line bg-white/[0.02] p-4">
        <p className="text-sm font-semibold">{displayName}</p>
        <p className="text-xs text-muted">
          {displayTitle} · {displayBusiness}
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
          <li className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" aria-hidden /> Call</li>
          <li className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" aria-hidden /> WhatsApp</li>
          <li className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" aria-hidden /> Email</li>
          <li className="flex items-center gap-1.5"><UserPlus className="h-3.5 w-3.5" aria-hidden /> Save contact</li>
        </ul>
      </div>
      <p className="mt-3 text-[0.7rem] leading-relaxed text-faint">An illustration of the layout only. Final design, QR code and NFC programming are produced after your order is confirmed.</p>
    </figure>
  );
}
