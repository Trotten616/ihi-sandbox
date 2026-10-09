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
    ["u-casey",   "S-CB",  "CJB", ["Casey Bennett", "Christopher Bennett"], null],
    ["u-laura",    "S-LK",  "LMK", ["Laura Keller"], null],
    ["u-dana",   "S-DH",  "DLH", ["Dana Howard"], null],
    ["u-carla",   "S-CM",  "CAM", ["Carla Mason"], null],
    ["u-kara",  "S-KT",  "KAT", ["Kara Tanner"], null],
    ["u-sara",   "S-SV",  "SAV", ["Sara Vance", "Sara Van Horn"], null],
    ["u-sandra", "S-SW",  "SRW", ["Sandra Webb"], null],
    ["u-stella",   "S-SS",  "SKS", ["Stella Shaw"], null],
    ["u-shelby",  "S-SL",  "SML", ["Shelby Lane"], null], /* real MS lists "SHELBY LANE" + "Shelby Lane" (matched case-insensitively) */
    ["u-tobyb",  "S-TB",  "TJB", ["Toby Baker"], null],
    ["u-erin",   "S-ET",  "EKT", ["Erin Tate"], null],
    ["u-taylorc",  "S-TC",  "TRC", ["Taylor Cole"], null],
    ["u-tom",     "S-TO",  "TPO", ["Tom Otten"], null]
  ].map((r) => ({ userId: r[0], accessStaff: r[1], accessInitials: r[2], msNames: r[3], hatchMemberId: r[4] }));
  const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

  /* v15 — the ONLY display spellings (Thomas 2026-10-07). Every screen takes names from SampleData.users; this list
   * guards against drift (checked in the v15 test run). */
  const CANONICAL = {
    "u-casey": "Casey Bennett", "u-laura": "Laura Keller", "u-dana": "Dana Howard", "u-carla": "Carla Mason",
    "u-kara": "Kara Tanner", "u-sara": "Sara Vance", "u-sandra": "Sandra Webb", "u-stella": "Stella Shaw",
    "u-erin": "Erin Tate", "u-taylorc": "Taylor Cole", "u-shelby": "Shelby Lane", "u-tobyb": "Toby Baker", "u-tom": "Tom Otten"
  };
  /* Lookalikes that must NEVER map to our staff. Some are real, different, inactive people in Access STAFF /
   * MarketSharp Employees (Shelia Tate, David Smiddy, Jeff Shaw, LaJanette Lane); others are misspellings seen
   * in reports. Match on exact name or staff code only, never fuzzy. */
  const LOOKALIKES = ["Shelia Long", "Shelia Lane", "Shelby Long", "Shelia Tate", "Stella Smiddy", "David Smiddy", "Jeff Shaw",
    "Casey Baerman", "Casey Bareman", "LaJanette Lane", "Lajanette 2 Lane", "Sara Vanhorne", "Dana Honeycutt", "Kara Turashof"];
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
