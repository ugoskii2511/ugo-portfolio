"""HTML layout for outreach emails.

Designed to read like a polished personal letter, not a newsletter:
cold emails that look like marketing (banners, many images, heavy colour)
get filtered into Promotions/Spam. So: one white card, readable type, a
small sender header, one "recent work" card with a real screenshot, one
WhatsApp button, a proper signature and a quiet opt-out footer.

Email-client safe: table layout, inline styles, web-safe font stack, no
external CSS or scripts, every image has alt text and the message still
makes sense with images blocked. A plain-text part is always sent too.
"""

from __future__ import annotations

import html
import re
from dataclasses import dataclass, field

ACCENT = "#3d6bff"
INK = "#1f2328"
MUTED = "#57606a"
FAINT = "#8c959f"
LINE = "#e6e8eb"
FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

_URL = re.compile(r"https?://[^\s<>()]+[^\s<>().,;:!?\"'”]")


def _text(value: str) -> str:
    """Escape, link bare URLs, keep single line breaks."""
    escaped = html.escape(value)
    linked = _URL.sub(lambda m: f'<a href="{m.group(0)}" style="color:{ACCENT};text-decoration:underline">{m.group(0)}</a>', escaped)
    return linked.replace("\n", "<br>")


@dataclass
class Project:
    url: str
    label: str  # e.g. "a school website I built in Gwarinpa, Abuja"
    name: str | None = None  # e.g. "Prudential International School"
    image: str | None = None  # public screenshot URL


@dataclass
class Signature:
    name: str
    title: str = ""
    website: str = ""
    contact_line: str = ""
    whatsapp_url: str | None = None


@dataclass
class EmailParts:
    preheader: str
    greeting: str
    paragraphs: list[str]
    project: Project | None
    ask: str
    closing: str
    signature: Signature
    optout: str
    unsubscribe_url: str | None = None
    extra_links: list[tuple[str, str]] = field(default_factory=list)


def _button(href: str, label: str) -> str:
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px">'
        "<tr>"
        f'<td style="border-radius:999px;background:{ACCENT}">'
        f'<a href="{html.escape(href, quote=True)}" style="display:inline-block;padding:11px 22px;font-family:{FONT};font-size:14px;font-weight:600;'
        f'line-height:1;color:#ffffff;text-decoration:none;border-radius:999px">{html.escape(label)}</a>'
        "</td></tr></table>"
    )


def _project_card(p: Project) -> str:
    title = html.escape(p.name or "Recent work")
    href = html.escape(p.url, quote=True)
    image_cell = ""
    if p.image:
        image_cell = (
            f'<td width="84" valign="top" style="padding:14px 0 14px 14px">'
            f'<a href="{href}"><img src="{html.escape(p.image, quote=True)}" width="70" alt="Screenshot of {title}" '
            f'style="display:block;width:70px;height:auto;max-height:112px;border:1px solid {LINE};border-radius:8px;object-fit:cover;object-position:top"></a>'
            "</td>"
        )
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="margin:6px 0 22px;border:1px solid {LINE};border-radius:12px;border-collapse:separate">'
        f"<tr>{image_cell}"
        f'<td valign="middle" style="padding:14px 16px;font-family:{FONT}">'
        f'<div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:{FAINT}">Recent work</div>'
        f'<div style="margin-top:4px;font-size:15px;font-weight:600;color:{INK}">{title}</div>'
        f'<div style="margin-top:2px;font-size:13px;color:{MUTED}">{html.escape(p.label[0].upper() + p.label[1:])}</div>'
        f'<div style="margin-top:8px;font-size:13px"><a href="{href}" style="color:{ACCENT};text-decoration:none;font-weight:600">View the project &rarr;</a></div>'
        "</td></tr></table>"
    )


def render(parts: EmailParts) -> str:
    sig = parts.signature
    initials = "".join(w[0] for w in sig.name.split()[:2]).upper() or "U"
    p_style = f"margin:0 0 16px;font-family:{FONT};font-size:15px;line-height:1.6;color:{INK}"
    body = "".join(f'<p style="{p_style}">{_text(p)}</p>' for p in parts.paragraphs)

    sig_lines = [f'<div style="font-size:15px;font-weight:600;color:{INK}">{html.escape(sig.name)}</div>']
    if sig.title:
        sig_lines.append(f'<div style="font-size:13px;color:{MUTED}">{html.escape(sig.title)}</div>')
    links = []
    if sig.website:
        links.append(f'<a href="{html.escape(sig.website, quote=True)}" style="color:{ACCENT};text-decoration:none">{html.escape(re.sub(r"^https?://", "", sig.website))}</a>')
    if sig.contact_line:
        links.append(html.escape(sig.contact_line))
    if links:
        sig_lines.append(f'<div style="margin-top:6px;font-size:13px;color:{MUTED}">{" &nbsp;·&nbsp; ".join(links)}</div>')

    footer = html.escape(parts.optout)
    if parts.unsubscribe_url:
        footer += f' <a href="{html.escape(parts.unsubscribe_url, quote=True)}" style="color:{FAINT};text-decoration:underline">Unsubscribe</a>.'

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>{html.escape(parts.preheader[:60])}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">{html.escape(parts.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6">
<tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#ffffff;border:1px solid {LINE};border-radius:14px;border-collapse:separate">
<tr><td style="padding:26px 30px 6px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="36" height="36" align="center" valign="middle" style="width:36px;height:36px;border-radius:999px;background:{ACCENT};font-family:{FONT};font-size:13px;font-weight:700;color:#ffffff">{html.escape(initials)}</td>
    <td style="padding-left:10px;font-family:{FONT}">
      <div style="font-size:14px;font-weight:600;color:{INK}">{html.escape(sig.name)}</div>
      <div style="font-size:12px;color:{FAINT}">{html.escape(sig.title or "Web developer")}</div>
    </td>
  </tr></table>
</td></tr>
<tr><td style="padding:20px 30px 8px">
  <p style="{p_style}">{_text(parts.greeting)}</p>
  {body}
  {_project_card(parts.project) if parts.project else ""}
  <p style="{p_style}">{_text(parts.ask)}</p>
  {_button(sig.whatsapp_url, "Chat on WhatsApp") if sig.whatsapp_url else ""}
  <p style="margin:0 0 6px;font-family:{FONT};font-size:15px;color:{INK}">{html.escape(parts.closing)}</p>
  <div style="font-family:{FONT};padding-bottom:22px">{"".join(sig_lines)}</div>
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px">
<tr><td style="padding:14px 30px 0;font-family:{FONT};font-size:11.5px;line-height:1.5;color:{FAINT}">{footer}</td></tr>
</table>
</td></tr></table>
</body></html>"""
