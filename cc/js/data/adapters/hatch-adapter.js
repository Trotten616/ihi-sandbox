/* Hatch adapter — STUB (wire THIRD, once an API key + webhook exist). Feed map §3.
 * Today: API Keys & Sources = none, outbound webhooks = none, Zapier = not installed.
 *   Live feed: Hatch "communications" webhook (or Zapier New Communication Inbound/Outbound) → server → this adapter.
 *   Backfill: Bulk Export API (Enterprise, nightly) dataset conversation_items (conversation_id, actor_type, direction…).
 *   Public REST: Bearer key, https://api.usehatchapp.com/v1/… (100 req / 10 s). Never call from the browser with a key.
 *
 * Promise<HatchCommEvent[]>  HatchCommEvent = { source:"hatch", workspaceId, conversationId, contactId, actorType,
 *   actorUserId?, direction, channel, at, openedAt? }
 *   actorType "hatch" (bot/AI) | "contact" | user  → actorUserId → IdentityMap.fromHatch()  (true texter, once members are mapped)
 *   openedAt / "seen by" — NOT in Hatch's public docs. UI shows sample open times labeled
 *   "Hatch: open times TBD until API confirmed". Ask the Hatch AM; if Enterprise, check conversation_items / contact_history for
 *   opened_at / read_at / assignee columns. Interim "human engaged" proxy: first human outbound after the bot.
 *   Do NOT use MarketSharp Text Out under Tom as an open time.
 * Join to MarketSharp via phone/email/contact sync ids; to Access via phone (AREAHM+HMNUM) or LEADNUM in notes.
 * UI rule: no Hatch logo/colors/bot name; "Hatch" appears only as a plain system badge.
 */
(function () {
  "use strict";
  const NS = (window.DashboardAdapters = window.DashboardAdapters || {});
  NS.hatch = {
    id: "hatch",
    label: "Hatch",
    isLive: false,
    streams: { texts: { system: "Hatch", detail: "communications (not keyed yet)" } },
    fetchCommEvents(/* { from, to } */) {
      return Promise.reject(new Error("Hatch not connected yet — no API key or webhook (sample data in use)."));
    },
    /* Customer record (v14) — STUB. "Show Conversation" link: Promise<{ threadId, lastAt } | null> found by the
     * customer's phone (E.164). Messages then come from fetchCommEvents / the Speed to Lead thread. */
    fetchThreadByPhone(/* phone */) {
      return Promise.reject(new Error("Hatch thread lookup not connected yet (sample data in use)."));
    },
    fetchMarketerRaw() {
      return Promise.reject(new Error("Hatch adapter not connected yet."));
    }
  };
})();
