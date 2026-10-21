/* Identity map — one person = one Command Center user across Access, MarketSharp and Hatch.
 * Field names follow /workspace/automation-plan/CommandCenter_Activity_Feed_Map.md:
 *   Access      STAFF.STAFF (staff code: LEAD.OPERATOR, APPOINTMENTS.WHOSET) and STAFF.INITIALS
 *               (APPOINTMENTS.WHOCONFIRM, FINCOM.CMNTWHO, "DE [initials]" in LEAD.COMMENT)
 *   MarketSharp Employees.id → Activities.assignToEmployeeId / scheduledByEmployeeId. The same person often has an
 *               id in company 4746 AND company 1 → merge by Employees.name (msNames lists every spelling seen).
 *   Hatch       workspace member id (HatchCommEvent.actorUserId) — none known yet (no API key created).
 * SAMPLE VALUES: the staff codes / initials below are placeholders. Live: build from STAFF + Employees + Hatch
 * members once, let Thomas confirm the matches, then store (no names are guessed at runtime).
 *
 * Hatch proxy rule: MarketSharp Text Out/In assigned to Tom (Hatch's integration employee) whose name contains
 * "Hatch" (e.g. "Hatch - Outbound sms/email") = Hatch system/AI → isHatchProxy, credited to nobody. */
(function () {
  "use strict";
  const PEOPLE = [
    /* id,          Access STAFF, INITIALS, MarketSharp names (both company ids), Hatch member id */
    ["u-chris",   "S-CB",  "CJB", ["Chris Baareman", "Christopher Baareman"], null],
    ["u-lisa",    "S-LK",  "LMK", ["Lisa Kolenda"], null],
    ["u-diana",   "S-DH",  "DLH", ["Diana Honicutt"], null],
    ["u-cindy",   "S-CM",  "CAM", ["Cindy Moreno"], null],
    ["u-karrie",  "S-KT",  "KAT", ["Karrie Turashoff"], null],
    ["u-sally",   "S-SV",  "SAV", ["Sally VanHorn", "Sally Van Horn"], null],
    ["u-saundra", "S-SW",  "SRW", ["Saundra Wells"], null],
    ["u-stacy",   "S-SS",  "SKS", ["Stacy Snively"], null],
    ["u-sheila",  "S-SL",  "SML", ["Sheila Lung"], null], /* real MS lists "SHEILA LUNG" + "Sheila Lung" (matched case-insensitively) */
    ["u-tylerb",  "S-TB",  "TJB", ["Tyler Budd"], null],
    ["u-emily",   "S-ET",  "EKT", ["Emily Thompson"], null],
    ["u-tylerc",  "S-TC",  "TRC", ["Tyler Carpenter"], null],
    ["u-tom",     "S-TO",  "TPO", ["Tom Otten"], null]
  ].map((r) => ({ userId: r[0], accessStaff: r[1], accessInitials: r[2], msNames: r[3], hatchMemberId: r[4] }));
  const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

  /* v15 — the ONLY display spellings (Thomas 2026-10-07). Every screen takes names from SampleData.users; this list
   * guards against drift (checked in the v15 test run). */
  const CANONICAL = {
    "u-chris": "Chris Baareman", "u-lisa": "Lisa Kolenda", "u-diana": "Diana Honicutt", "u-cindy": "Cindy Moreno",
    "u-karrie": "Karrie Turashoff", "u-sally": "Sally VanHorn", "u-saundra": "Saundra Wells", "u-stacy": "Stacy Snively",
    "u-emily": "Emily Thompson", "u-tylerc": "Tyler Carpenter", "u-sheila": "Sheila Lung", "u-tylerb": "Tyler Budd", "u-tom": "Tom Otten"
  };
  /* Lookalikes that must NEVER map to our staff. Some are real, different, inactive people in Access STAFF /
   * MarketSharp Employees (Shelia Thompson, David Smiddy, Jeff Snively, LaJanette Lung); others are misspellings seen
   * in reports. Match on exact name or staff code only, never fuzzy. */
  const LOOKALIKES = ["Shelia Long", "Shelia Lung", "Sheila Long", "Shelia Thompson", "Stacy Smiddy", "David Smiddy", "Jeff Snively",
    "Chris Baerman", "Chris Bareman", "LaJanette Lung", "Lajanette 2 Lung", "Sally Vanhorne", "Diana Honeycutt", "Karrie Turashof"];
  const HATCH_INTEGRATION_USER = "u-tom"; /* the employee id configured in Hatch's MarketSharp integration */

  const IdentityMap = {
    isSample: true,
    people: PEOPLE,
    hatchIntegrationUserId: HATCH_INTEGRATION_USER,
    /* Access: staff code (OPERATOR / WHOSET) or initials (WHOCONFIRM / CMNTWHO) → user id | null */
    fromAccess(key) { const k = norm(key); const p = PEOPLE.find((x) => norm(x.accessStaff) === k || norm(x.accessInitials) === k); return p ? p.userId : null; },
    /* MarketSharp: Employees.name (any company id) → user id | null */
    fromMarketSharp(employeeName) { if (IdentityMap.isLookalike(employeeName)) return null; const k = norm(employeeName); const p = PEOPLE.find((x) => x.msNames.some((n) => norm(n) === k)); return p ? p.userId : null; },
    /* Hatch: workspace member id → user id | null (unknown until Hatch is keyed) */
    fromHatch(memberId) { const p = memberId ? PEOPLE.find((x) => x.hatchMemberId === memberId) : null; return p ? p.userId : null; },
    /* MarketSharp activity written by Hatch's integration under Tom → system/AI, not Tom */
    isHatchProxy(act) { return !!act && (/hatch/i.test(act.name || "") || /hatch/i.test(act.employeeName || "")) && IdentityMap.fromMarketSharp(act.employeeName) === HATCH_INTEGRATION_USER; },
    canonical: CANONICAL,
    lookalikes: LOOKALIKES,
    isLookalike(name) { const k = norm(name); return LOOKALIKES.some((x) => norm(x) === k); },
    accessCodes(userId) { const p = PEOPLE.find((x) => x.userId === userId); return p ? { staff: p.accessStaff, initials: p.accessInitials } : null; }
  };
  window.IdentityMap = IdentityMap;
})();
