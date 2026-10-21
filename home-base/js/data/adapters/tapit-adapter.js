/* Tapit adapter — STUB (not wired).
 *
 * TODO (confirm with Thomas what Tapit provides before wiring):
 *  - If Tapit is the phone/dialer system, it can replace or cross-check callActivity
 *    (Total Calls In & Out) when the MarketSharp Call Center Report undercounts calls that weren’t logged.
 *    Output rows: { date, userId, callsIn, callsOut } grouped by agent + day.
 *  - Map Tapit agent → Command Center user id.
 */
(function () {
  "use strict";
  const NS = (window.DashboardAdapters = window.DashboardAdapters || {});
  NS.tapit = {
    id: "tapit",
    label: "Tapit",
    isLive: false,
    streams: { callActivity: { system: "Tapit", detail: "Call log (TBD)" } },
    fetchMarketerRaw() {
      return Promise.reject(new Error("Tapit adapter not connected yet."));
    }
  };
})();
