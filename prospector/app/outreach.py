"""Personalised outreach messages built only from recorded facts.

Rules:
- Every observation about the business comes from a stored fact (its
  listing, website status evidence, or an audit finding), and the facts
  used are saved with the draft.
- No invented problems, numbers, prior contact, partnerships or results.
- A follow-up can only be drafted if a previous message was logged.
- Wording comes from several hand-written variants per situation, picked
  per business (stable for the same business), so messages read like a
  person wrote them rather than a mail merge.
- WhatsApp messages are short and conversational; emails carry a subject,
  a signature and an opt-out (a working unsubscribe link when sent
  automatically).
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

TEMPLATES = {
    "new_website": "New website",
    "website_rescue": "Website not loading",
    "redesign": "Website improvements",
    "mobile": "Mobile usability",
    "ecommerce": "Online store",
    "school_website": "School website",
    "audit_summary": "Website audit summary",
    "consultation": "Consultation invite",
    "follow_up": "Follow-up",
}

# Industry -> (portfolio path, what to point at). Paths are real case studies.
PORTFOLIO = {
    "Education": ("/work/prudential-international-school", "a school website I built in Gwarinpa, Abuja"),
    "Retail": ("/work/chimdys-collection", "an online store I built for a jewellery brand"),
    "Fashion": ("/work/chimdys-collection", "an online store I built for a jewellery brand"),
    "Food & drink": ("/work/naija-bites", "a restaurant website I built"),
    "Hospitality": ("/work", "websites I've built for businesses"),
    "Real estate": ("/work/aurelle-properties", "a property website I built"),
    "Logistics": ("/work/cometra-logistics", "a logistics company website I built"),
    "Beauty & wellness": ("/work/blackgold-barber", "a website I built for a grooming business"),
    "Professional services": ("/work/plot-one", "a website I built for an Abuja mortgage brokerage"),
}

# Plain-language observation for an audit finding (only used when that
# finding actually failed/warned; the evidence string is the proof).
OBSERVATIONS = {
    "viewport": "your homepage isn't set up for phones, so visitors on mobile get a zoomed-out desktop page",
    "https": "your site loads without HTTPS, so browsers show it as “Not secure”",
    "meta_description": "your homepage has no description for Google, so search results show a generic snippet under your name",
    "title": "your homepage has no page title, which hurts how you show up on Google",
    "contact": "I couldn't find a call button, WhatsApp link or enquiry form on your homepage",
    "cta": "the homepage doesn't have a clear button for visitors to book, order or get in touch",
    "pagespeed_performance": "Google's PageSpeed test rates your homepage as slow on mobile",
    "broken_links": "a few links on your site lead to error pages",
    "open_graph": "when your link is shared on WhatsApp it doesn't show a preview image or title",
    "noindex": "your homepage is set to “noindex”, which tells Google not to show it in search",
    "reachable": "your website didn't load when I tried it",
}
OBSERVATION_ORDER = ["reachable", "noindex", "https", "viewport", "pagespeed_performance", "contact", "cta", "meta_description", "title", "broken_links", "open_graph"]


class DraftError(ValueError):
    pass


@dataclass
class Draft:
    template: str
    channel: str
    subject: str | None
    body: str
    facts: list[dict]


def pick_channel(prospect: dict) -> str:
    if prospect.get("email"):
        return "email"
    if prospect.get("phone"):
        return "whatsapp"
    return "other"


def suggest_template(prospect: dict, findings: list[dict] | None) -> str:
    status = prospect.get("websiteStatus")
    if status == "NONE_FOUND":
        return "school_website" if prospect.get("industry") == "Education" else "new_website"
    if status == "UNCERTAIN":
        return "website_rescue"
    problems = {f["key"] for f in findings or [] if f.get("status") in ("fail", "warn")}
    if "viewport" in problems:
        return "mobile"
    if problems & set(OBSERVATIONS):
        return "redesign"
    if prospect.get("industry") in ("Retail", "Fashion"):
        return "ecommerce"
    return "consultation"


def pick(seed: str, key: str, options: list[str]) -> str:
    """Stable choice per business and slot (same business, same wording)."""
    digest = hashlib.sha256(f"{seed}:{key}".encode()).digest()
    return options[digest[0] % len(options)]


def _location(prospect: dict) -> str:
    place = prospect.get("city") or prospect.get("state")
    return f" in {place}" if place else ""


def _first_name(settings: dict) -> str:
    name = (settings["outreach"].get("sender_name") or "").strip()
    return name.split()[0] if name else "there"


def _source_phrase(prospect: dict, seed: str) -> tuple[str, dict]:
    name = prospect["businessName"]
    source = prospect.get("source")
    if source == "openstreetmap":
        text = pick(seed, "source", [
            f"I came across {name}{_location(prospect)} while looking up local businesses",
            f"I found {name}{_location(prospect)} on the map while looking at businesses in the area",
            f"I came across {name}{_location(prospect)} recently",
        ])
        return text, {"fact": "source", "value": prospect.get("sourceUrl")}
    if source == "inbound":
        return "Thanks for requesting a website review", {"fact": "source", "value": "inbound request"}
    return f"I came across {name}{_location(prospect)}", {"fact": "source", "value": source}


def _portfolio(prospect: dict, portfolio_url: str) -> tuple[str, str, dict]:
    path, label = PORTFOLIO.get(prospect.get("industry") or "", ("/work", "some of the sites I've built"))
    url = portfolio_url + path
    return label, url, {"fact": "portfolio_link", "value": url}


def _ask(seed: str, channel: str) -> str:
    if channel == "whatsapp":
        return pick(seed, "ask", [
            "Would you be open to a quick chat about it?",
            "Can I send you a few ideas?",
            "Would that be something you'd like to talk about?",
        ])
    return pick(seed, "ask", [
        "Would you be open to a quick chat this week?",
        "Would it help if I shared a few ideas for what this could look like for you?",
        "If it's useful, I'm happy to have a short call. No obligation at all.",
    ])


def build_draft(
    prospect: dict,
    findings: list[dict] | None,
    settings: dict,
    *,
    template: str | None = None,
    last_outreach: dict | None = None,
    channel: str | None = None,
    unsubscribe_url: str | None = None,
) -> Draft:
    if prospect.get("doNotContact") or prospect.get("stage") == "DO_NOT_CONTACT":
        raise DraftError("This prospect is on the do-not-contact list.")
    template = template or suggest_template(prospect, findings)
    if template not in TEMPLATES:
        raise DraftError(f"Unknown template: {template}")
    channel = channel or pick_channel(prospect)
    if channel == "email" and not prospect.get("email"):
        raise DraftError("This prospect has no email address.")
    if channel == "whatsapp" and not prospect.get("phone"):
        raise DraftError("This prospect has no phone number.")

    seed = str(prospect.get("id") or prospect["businessName"])
    name = prospect["businessName"]
    first = _first_name(settings)
    portfolio_url = settings.get("_portfolio_url", "")
    facts: list[dict] = []
    problems = [f for f in findings or [] if f.get("status") in ("fail", "warn")]
    problem_keys = {f["key"]: f for f in problems}
    observations: list[str] = []
    for key in OBSERVATION_ORDER:
        if key in problem_keys:
            observations.append(OBSERVATIONS[key])

    source, fact = _source_phrase(prospect, seed)
    facts.append(fact)
    label, link, link_fact = _portfolio(prospect, portfolio_url)
    facts.append(link_fact)

    # ---- the core of the message: what was noticed and why it matters
    point: list[str] = []  # 1–2 short paragraphs
    subject_options: list[str]

    if template == "follow_up":
        if not last_outreach:
            raise DraftError("No earlier message has been logged for this prospect, so there's nothing to follow up on.")
        sent = last_outreach["createdAt"]
        when = f"{sent.day} {sent:%B}" if hasattr(sent, "strftime") else str(sent)[:10]
        facts.append({"fact": "previous_outreach", "value": str(last_outreach["createdAt"])[:10]})
        subject_options = [f"Re: {name}", f"Following up: {name}", f"Quick follow-up for {name}"]
        point.append(pick(seed, "fu1", [
            f"I sent a message on {when} about your website and wanted to follow up in case it got buried.",
            f"Just following up on my message from {when}. I know things get busy.",
        ]))
        point.append(pick(seed, "fu2", [
            "If it's not a priority right now, no problem at all. If it is, a short call is enough for me to understand what you need and give you a clear quote.",
            "Happy to answer any questions, or to send a few ideas first if that's easier.",
        ]))
    elif template in ("new_website", "school_website"):
        if prospect.get("websiteStatus") != "NONE_FOUND":
            raise DraftError("This template is for businesses with no website found.")
        facts.append({"fact": "website_status", "value": prospect.get("websiteEvidence") or "NONE_FOUND"})
        subject_options = [f"A website for {name}", f"{name} online", f"Quick question about {name}"]
        point.append(source + ", " + pick(seed, "noweb", [
            "and I couldn't find a website for the business.",
            "and noticed I couldn't find a website for you online.",
            "but I couldn't find a website for you when I searched.",
        ]))
        if template == "school_website":
            point.append(pick(seed, "school", [
                "Many parents look a school up online before they visit. A simple school website with your story, admissions information and contact details answers their questions and makes it easy for them to reach you.",
                "Parents increasingly check a school online first. A clear website showing your facilities, admissions process and how to get in touch can make that first impression for you.",
            ]))
        else:
            point.append(pick(seed, "value", [
                "A lot of customers search online before they call or visit. A simple, mobile-friendly website shows them what you offer and where you are, and lets them reach you in one tap.",
                "A clean website helps people find you on Google, see what you offer and contact you straight away, even outside working hours.",
                "Even a simple website makes a big difference: people can find you on Google, see your services, and message or call you directly from their phone.",
            ]))
    elif template == "website_rescue":
        if prospect.get("websiteStatus") != "UNCERTAIN":
            raise DraftError("This template is for listed websites that didn't load.")
        facts.append({"fact": "website_status", "value": prospect.get("websiteEvidence")})
        site = prospect.get("websiteDomain") or prospect.get("website") or "your website"
        subject_options = [f"Your website ({site})", f"Is {site} down?", f"Quick heads-up about {site}"]
        point.append(source + pick(seed, "down", [
            f", and when I tried to open your website ({site}) it didn't load for me.",
            f". I tried to visit {site}, but it didn't load.",
        ]))
        point.append(pick(seed, "down2", [
            "It may just be a temporary hosting or domain issue, but if customers see the same thing you could be missing enquiries. I can check what's wrong and get it working again.",
            "Sometimes it's an expired domain or a hosting problem. Happy to take a look and fix it, or rebuild it if that turns out to be the better option.",
        ]))
    elif template in ("redesign", "mobile", "audit_summary", "ecommerce", "consultation"):
        for key in OBSERVATION_ORDER:
            if key in problem_keys:
                facts.append({"fact": f"audit:{key}", "value": problem_keys[key]["evidence"]})
        if template in ("redesign", "mobile", "audit_summary") and not observations:
            raise DraftError("The latest audit found no issues to mention, so this template doesn't apply.")
        site = prospect.get("websiteDomain") or name
        if template == "ecommerce":
            if "ecommerce" in problem_keys:
                facts.append({"fact": "audit:ecommerce", "value": problem_keys["ecommerce"]["evidence"]})
            subject_options = [f"Selling online with {name}", f"An online store for {name}", f"{name}: orders online"]
            point.append(source + ". " + pick(seed, "shop", [
                "I build online stores for Nigerian businesses, with product pages, cart and checkout, and Paystack payments.",
                "I help businesses sell online with simple stores customers can browse and pay on, using Paystack.",
            ]))
            point.append("If you sell products, a store lets customers browse and pay any time, without waiting for a reply on WhatsApp.")
        elif template == "consultation":
            subject_options = [f"Working with {name}", f"A quick idea for {site}", f"{name}'s website"]
            point.append(source + ". " + pick(seed, "consult", [
                "I help businesses get websites and web apps that bring in enquiries, and I had a quick look at yours.",
                "I build websites for businesses like yours, and I had a quick look at your site.",
            ]))
            if observations:
                point.append(f"One thing I noticed: {observations[0]}.")
        elif template == "audit_summary":
            subject_options = [f"Website check: {site}", f"A few notes on {site}", f"Quick website review for {name}"]
            items = "\n".join(f"• {o[0].upper() + o[1:]}." for o in observations[:4])
            point.append(f"{source}, and I ran a quick check on your website. A few things stood out:\n\n{items}")
            point.append("Most of these are quick fixes. I'm happy to send the full report and walk you through it.")
        else:
            subject_options = [f"A few ideas for {site}", f"{name} on mobile" if template == "mobile" else f"Quick note about {site}", f"Your website ({site})"]
            lead = observations[0]
            more = f" I also noticed {observations[1]}." if len(observations) > 1 else ""
            point.append(f"{source}, and while looking at your website I noticed that {lead}.{more}")
            point.append(pick(seed, "fix", [
                "These are fixable, and they affect how easily visitors can find and contact you.",
                "It's the kind of thing that quietly costs enquiries, and it's usually quick to sort out.",
            ]))
    else:  # pragma: no cover - TEMPLATES guard above
        raise DraftError(f"Unknown template: {template}")

    if channel == "whatsapp":
        greeting = pick(seed, "wa_greet", [f"Hello, good day. Is this {name}?", f"Good day, {name} team.", f"Hello {name}, good day."])
        intro = pick(seed, "wa_intro", [f"My name is {first}, I'm a web developer.", f"I'm {first}, a web developer here in Nigeria."])
        # Keep WhatsApp short: first point only (+ the reason it matters for "no website" style messages).
        core = point[:2] if template in ("new_website", "school_website", "website_rescue") else point[:1]
        body_parts = [
            greeting,
            # A follow-up doesn't re-introduce: they've heard from me already.
            core[0] if template == "follow_up" else f"{intro} " + core[0],
            *core[1:],
            f"Here's {label}: {link}",
            _ask(seed, "whatsapp"),
            pick(seed, "wa_optout", [
                "If it's not useful, no problem at all, just let me know and I won't message again.",
                "If this isn't for you, just say so and I won't bother you again.",
            ]),
        ]
        body = "\n\n".join(body_parts)
        return Draft(template=template, channel="whatsapp", subject=None, body=body, facts=facts)

    # Email
    o = settings["outreach"]
    greeting = pick(seed, "em_greet", [f"Hello {name} team,", f"Good day {name} team,", f"Hi {name} team,"])
    signature = "\n".join(line for line in [o.get("sender_name"), o.get("sender_title") or "", portfolio_url, o.get("contact_line") or ""] if line)
    if unsubscribe_url:
        optout = f"You're getting this because {name}'s contact details are listed publicly. If you'd rather not hear from me, unsubscribe here: {unsubscribe_url} (or just reply “no thanks”)."
    else:
        optout = "If this isn't useful, just reply “no thanks” and I won't contact you again."
    body = "\n\n".join([
        greeting,
        *point,
        f"You can see {label} here: {link}",
        _ask(seed, "email"),
        pick(seed, "em_close", ["Best regards,", "Kind regards,", "Thanks,"]) + "\n" + signature,
        "—\n" + optout,
    ])
    subject = pick(seed, "subject", subject_options)
    return Draft(template=template, channel="email", subject=subject, body=body, facts=facts)
