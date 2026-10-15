"""Personalised outreach drafts built only from recorded facts.

Rules:
- Every observation about the business comes from a stored fact (its
  listing, website status evidence, or an audit finding), and the facts
  used are saved with the draft.
- No invented problems, numbers, prior contact, partnerships or results.
- A follow-up can only be drafted if a previous message was logged.
- Drafts are never sent automatically; a human approves and sends them.
"""

from __future__ import annotations

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
    "viewport": "your homepage isn't set up for phones (it has no mobile viewport), so most visitors on mobile get a zoomed-out desktop page",
    "https": "your site loads over plain HTTP rather than HTTPS, so browsers mark it as “Not secure”",
    "meta_description": "your homepage has no meta description, so Google shows a generic snippet under your name",
    "title": "your homepage has no page title, which hurts how you appear in search results",
    "contact": "I couldn't find a call button, WhatsApp link or enquiry form on your homepage",
    "cta": "the homepage doesn't have a clear button for visitors to book, order or get in touch",
    "pagespeed_performance": "Google's PageSpeed test rates your homepage as slow on mobile",
    "broken_links": "a few links on your site lead to error pages",
    "open_graph": "links to your site shared on WhatsApp don't show a preview image or title",
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


def _location(prospect: dict) -> str:
    place = prospect.get("city") or prospect.get("state")
    return f" in {place}" if place else ""


def _greeting(prospect: dict) -> str:
    return f"Hello {prospect['businessName']} team,"


def _signoff(settings: dict, channel: str) -> str:
    o = settings["outreach"]
    lines = [o["sender_name"], o.get("sender_title") or "", settings.get("_portfolio_url", ""), o.get("contact_line") or ""]
    signoff = "\n".join(line for line in lines if line)
    if channel == "email":
        signoff += "\n\nIf this isn't useful, just reply “no thanks” and I won't contact you again."
    return signoff


def _portfolio_line(prospect: dict, portfolio_url: str) -> tuple[str, dict]:
    path, label = PORTFOLIO.get(prospect.get("industry") or "", ("/work", "some of the sites I've built"))
    url = portfolio_url + path
    return f"You can see {label} here: {url}", {"fact": "portfolio_link", "value": url}


def _source_phrase(prospect: dict) -> tuple[str, dict]:
    source = prospect.get("source")
    if source == "openstreetmap":
        return f"I came across {prospect['businessName']}{_location(prospect)} on OpenStreetMap", {"fact": "source", "value": prospect.get("sourceUrl")}
    if source == "inbound":
        return "Thanks for requesting a website review", {"fact": "source", "value": "inbound request"}
    return f"I came across {prospect['businessName']}{_location(prospect)}", {"fact": "source", "value": source}


def build_draft(prospect: dict, findings: list[dict] | None, settings: dict, *, template: str | None = None, last_outreach: dict | None = None) -> Draft:
    if prospect.get("doNotContact") or prospect.get("stage") == "DO_NOT_CONTACT":
        raise DraftError("This prospect is on the do-not-contact list.")
    template = template or suggest_template(prospect, findings)
    if template not in TEMPLATES:
        raise DraftError(f"Unknown template: {template}")
    channel = pick_channel(prospect)
    portfolio_url = settings.get("_portfolio_url", "")
    facts: list[dict] = []
    problems = [f for f in findings or [] if f.get("status") in ("fail", "warn")]
    problem_keys = {f["key"]: f for f in problems}
    name = prospect["businessName"]
    paragraphs: list[str] = []
    subject: str | None = None

    opener, fact = _source_phrase(prospect)
    facts.append(fact)

    if template == "follow_up":
        if not last_outreach:
            raise DraftError("No earlier message has been logged for this prospect, so there's nothing to follow up on.")
        sent = last_outreach["createdAt"]
        when = f"{sent.day} {sent:%B}" if hasattr(sent, "strftime") else str(sent)[:10]
        facts.append({"fact": "previous_outreach", "value": str(last_outreach["createdAt"])[:10]})
        subject = f"Following up: {name}"
        paragraphs.append(f"I'm following up on the message I sent on {when} about your website. I know things get busy, so I wanted to check whether it would be useful to talk.")
        paragraphs.append("A short call is enough for me to understand what you need and give you a clear quote, with no obligation.")
    elif template in ("new_website", "school_website"):
        if prospect.get("websiteStatus") != "NONE_FOUND":
            raise DraftError("This template is for businesses with no website found.")
        facts.append({"fact": "website_status", "value": prospect.get("websiteEvidence") or "NONE_FOUND"})
        subject = f"A website for {name}"
        paragraphs.append(f"{opener}, and I couldn't find a website for the business.")
        if template == "school_website":
            paragraphs.append(
                "Parents often look a school up online before they visit. A clear school website, with your story, admissions process, fees enquiries and contact details, gives them answers before they call, and makes it easy to apply."
            )
        else:
            service = prospect.get("recommendedService") or "business website"
            paragraphs.append(
                f"I'm a web developer based in Nigeria, and I build fast, mobile-friendly sites for businesses like yours. For {name}, I'd suggest a {service.lower()}: somewhere customers can find you on Google, see what you offer, and contact you in one tap."
            )
    elif template == "website_rescue":
        if prospect.get("websiteStatus") != "UNCERTAIN":
            raise DraftError("This template is for listed websites that didn't load.")
        facts.append({"fact": "website_status", "value": prospect.get("websiteEvidence")})
        subject = f"Your website: {prospect.get('websiteDomain') or name}"
        paragraphs.append(f"{opener}. When I tried to open your listed website ({prospect.get('website')}), it didn't load for me.")
        paragraphs.append("It may be a temporary hosting or domain issue, but if visitors see the same thing, you could be losing enquiries. I can check what's wrong and fix it, or rebuild the site if that's the better option.")
    elif template in ("redesign", "mobile", "audit_summary", "ecommerce", "consultation"):
        observations = []
        for key in OBSERVATION_ORDER:
            if key in problem_keys:
                observations.append(OBSERVATIONS[key])
                facts.append({"fact": f"audit:{key}", "value": problem_keys[key]["evidence"]})
        if template in ("redesign", "mobile", "audit_summary") and not observations:
            raise DraftError("The latest audit found no issues to mention, so this template doesn't apply.")
        subject = f"A few ideas for {prospect.get('websiteDomain') or name}"
        if template == "mobile":
            subject = f"{name} on mobile"
        if template == "audit_summary":
            subject = f"Website check: {prospect.get('websiteDomain') or name}"
            items = "\n".join(f"• {o[0].upper() + o[1:]}." for o in observations[:4])
            paragraphs.append(f"{opener}, and I ran a quick check on your website. A few things stood out:\n\n{items}")
            paragraphs.append("I'm happy to send the full report and walk you through the fixes. Most are quick wins.")
        elif template == "ecommerce":
            if "ecommerce" in problem_keys:
                facts.append({"fact": "audit:ecommerce", "value": problem_keys["ecommerce"]["evidence"]})
            subject = f"Selling online with {name}"
            paragraphs.append(f"{opener}. I build online stores for Nigerian businesses, with product pages, cart and checkout, and Paystack payments.")
            paragraphs.append("If you sell products, an online store lets customers browse and pay any time, without waiting for a reply on WhatsApp.")
        elif template == "consultation":
            subject = f"Working with {name}"
            paragraphs.append(f"{opener}. I'm a web developer based in Nigeria, and I help businesses build websites and web apps that bring in enquiries.")
            if observations:
                paragraphs.append(f"While looking at your site, I noticed {observations[0]}.")
            paragraphs.append("Would a short call be useful? I can share a few practical ideas for your website, with no obligation.")
        else:
            lead = observations[0]
            rest = observations[1:2]
            paragraphs.append(f"{opener}, and while looking at your website I noticed that {lead}." + (f" I also noticed {rest[0]}." if rest else ""))
            paragraphs.append("These are all fixable, and they affect how easily visitors can find and contact you. I can take care of it, from small fixes to a full redesign, depending on what you need.")

    link_line, link_fact = _portfolio_line(prospect, portfolio_url)
    facts.append(link_fact)
    paragraphs.append(link_line)
    if template != "follow_up":
        paragraphs.append("Would you be open to a quick chat this week?")
    body = "\n\n".join([_greeting(prospect), *paragraphs, "Best regards,\n" + _signoff(settings, channel)])
    if channel != "email":
        subject = None
    return Draft(template=template, channel=channel, subject=subject, body=body, facts=facts)
