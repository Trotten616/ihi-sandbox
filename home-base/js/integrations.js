/* Integrations catalog — sample status only. No live connections. */
window.IntegrationsCatalog = (function () {
  "use strict";

  const GROUPS = [
    { id: "systems", label: "Core systems", tip: "CRMs and databases Infinity uses today." },
    { id: "sync", label: "Sync links", tip: "How systems talk to each other." },
    { id: "vendors", label: "Lead vendors", tip: "Where new inquiries come from." },
    { id: "marketing", label: "Marketing & messaging", tip: "Campaigns, AI text, AI voice." },
    { id: "ops", label: "Office tools", tip: "Email, board, and related ops." }
  ];

  const items = [
    /* Core systems */
    { id: "marketsharp", group: "systems", name: "MarketSharp",
      blurb: "CRM for contacts, inquiries, appointments, and marketing reports. Illinois is a separate child company.",
      status: "Connected", statusTone: "ok",
      openLabel: "Open (sample)", openHref: "#integrations/marketsharp",
      detail: "Several vendors already feed leads here. Staff still re-type into Access." },
    { id: "access-mi", group: "systems", name: "Michigan Access",
      blurb: "In-house Access front end for MI leads, board, contracts, and Period End reports.",
      status: "Connected", statusTone: "ok",
      openLabel: "Open reports", openHref: "#reports",
      detail: "Three lead-activity-by-source reports hang in MI until back-end indexes are restored." },
    { id: "access-il", group: "systems", name: "Illinois Access",
      blurb: "Same Access app as Michigan, pointed at the Illinois database.",
      status: "Connected", statusTone: "ok",
      openLabel: "Open reports", openHref: "#reports",
      detail: "Same report objects as MI; indexes are healthy so Period End lead-activity reports run." },
    { id: "hatch", group: "systems", name: "Hatch",
      blurb: "AI texting conversations with homeowners. Humans take over after the silence rules.",
      status: "Connected", statusTone: "ok",
      openLabel: "Open Speed to Lead", openHref: "#speed",
      detail: "Sample threads appear under Speed to Lead (and Messages) in this draft." },
    { id: "ghl", group: "systems", name: "GoHighLevel",
      blurb: "Marketing campaigns, nurture sequences, and AI voice add-ons (A2P registration in progress).",
      status: "Needs setup", statusTone: "warn",
      openLabel: "Open Marketing", openHref: "#marketing",
      detail: "Being set up now. CRM must gate contacts by consent before any send." },

    /* Sync */
    { id: "hatch-ms", group: "sync", name: "Hatch ↔ MarketSharp",
      blurb: "Known sync so text conversations stay tied to MarketSharp contacts.",
      status: "Syncing", statusTone: "info",
      openLabel: "View status (sample)", openHref: "#integrations/hatch-ms",
      detail: "Sample only — shows as Syncing in this draft. Confirm ownership of failures with Thomas." },
    { id: "vendor-ms-feed", group: "sync", name: "Vendor → MarketSharp lead capture",
      blurb: "Automatic lead capture from vendors that already post into MarketSharp (e.g. Porch).",
      status: "Connected", statusTone: "ok",
      openLabel: "View status (sample)", openHref: "#integrations/vendor-ms-feed",
      detail: "Other vendors still arrive by email and are typed by hand." },

    /* Lead vendors — priority list from steering + blueprint 8.1 */
    { id: "porch", group: "vendors", name: "Porch",
      blurb: "Largest volume source. Flows into MarketSharp automatically (code PHPJS).",
      status: "Connected", statusTone: "ok",
      openLabel: "Vendor card (sample)", openHref: "#integrations/porch",
      detail: "Consent names Porch, not Infinity — human first contact only for AI/auto dial." },
    { id: "thumbtack", group: "vendors", name: "Thumbtack",
      blurb: "Marketplace messages and calls (code THUMBT).",
      status: "Connected", statusTone: "ok",
      openLabel: "Vendor card (sample)", openHref: "#integrations/thumbtack",
      detail: "Reply inside Thumbtack first for refund protection." },
    { id: "homebuddy", group: "vendors", name: "HomeBuddy",
      blurb: "Pay-per-lead vendor (code HOMBUD).",
      status: "Connected", statusTone: "ok",
      openLabel: "Vendor card (sample)", openHref: "#integrations/homebuddy",
      detail: "Request consent text and certificate from vendor." },
    { id: "homeyou", group: "vendors", name: "HomeYou",
      blurb: "Lead vendor intake (confirm Access code and feed method with office).",
      status: "Needs setup", statusTone: "warn",
      openLabel: "Vendor card (sample)", openHref: "#integrations/homeyou",
      detail: "Listed per Thomas scope — confirm how leads arrive today.",
      openQuestion: true },
    { id: "keyword", group: "vendors", name: "Keyword Connects",
      blurb: "Leads by email today (Access code INGHWB).",
      status: "Connected", statusTone: "ok",
      openLabel: "Vendor card (sample)", openHref: "#integrations/keyword",
      detail: "Plan: email parser or webhook into one intake pipeline." },
    { id: "angi", group: "vendors", name: "Angi (Ads / Leads)",
      blurb: "Angi Ads and Angi Leads — currently treated as Off for new automation in this draft.",
      status: "Off", statusTone: "off",
      openLabel: "Vendor card (sample)", openHref: "#integrations/angi",
      detail: "Thomas steer: Angi = off. Still documented for history and credit requests." },

    /* Marketing */
    { id: "ghl-campaigns", group: "marketing", name: "GoHighLevel campaigns",
      blurb: "Nurture, reactivation, and review-request sequences.",
      status: "Needs setup", statusTone: "warn",
      openLabel: "Open Marketing", openHref: "#marketing",
      detail: "Sample campaign cards live under Marketing." },
    { id: "ghl-voice", group: "marketing", name: "GoHighLevel AI voice",
      blurb: "AI voice add-ons for receptionist / outbound (consent-gated).",
      status: "Needs setup", statusTone: "warn",
      openLabel: "Open Marketing", openHref: "#marketing",
      detail: "A2P and consent gate required before any AI outbound." },
    { id: "hatch-ai-text", group: "marketing", name: "Hatch AI texting",
      blurb: "AI text conversations with the 1-hour human take-over rule.",
      status: "Connected", statusTone: "ok",
      openLabel: "Open Messages", openHref: "#messages",
      detail: "Credit split rules apply when AI already asked availability questions." },

    /* Ops */
    { id: "email-inbox", group: "ops", name: "Lead email inboxes",
      blurb: "Shared Gmail (and related) inboxes where vendor leads still arrive by email.",
      status: "Connected", statusTone: "ok",
      openLabel: "View (sample)", openHref: "#integrations/email-inbox",
      detail: "Sample only — no live mailbox wiring in this draft.",
      openQuestion: true },
    { id: "future-board", group: "ops", name: "Future Board",
      blurb: "Shared Google Sheet for rep slots (Infinity board + Gutter Helmet board), kept by hand today.",
      status: "Connected", statusTone: "ok",
      openLabel: "Open Appointments", openHref: "#appointments",
      detail: "Command Center Appointments board is the intended replacement view." }
  ];

  function getGroups() { return GROUPS; }
  function getAll() { return items; }
  function getById(id) { return items.find((x) => x.id === id) || null; }
  function byGroup(gid) { return items.filter((x) => x.group === gid); }

  return { getGroups, getAll, getById, byGroup };
})();
