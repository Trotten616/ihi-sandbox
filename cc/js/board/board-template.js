/* Future Board — GENERIC tenant template (no tenant data here).
   A tenant file (e.g. board-tenant-infinity.js) calls FutureBoardConfig.define({...}) to override any key.
   Everything the board engine needs lives in config: slots, colors, products, reps (with date ranges,
   offices, skills, recurring off days/slots), per-date overrides, city coordinates, routing rules. */
(function () {
  var TEMPLATE = {
    tenant: "template",
    slots: ["10:00", "12:00", "14:00", "16:00", "18:00"],     /* board rows per day */
    weekStartsOn: 0,                                          /* 0 = Sunday (period weeks run Sun–Sat) */
    apptMinutes: 90,                                          /* length of one visit, for tight-leg checks */
    routing: { maxLegMinutes: 45, roadFactor: 1.25, kmh: 80 },
    colors: {
      off: "#434343",                                         /* rep off: grey, no text, can't book */
      unconfirmedFill: "#434343", unconfirmedText: "#00FFFF",
      confirmed: { 1: "#C00000", 2: "#FF6D01", 3: "#FFFF00" } /* fill by days out; later = no fill */
    },
    products: [],        /* [{ code, label, aliases? }] */
    offices: [],         /* [{ code, label }] */
    cities: {},          /* { "Portage": { lat, lng, office } } — approximate, public geography only */
    reps: [],            /* [{ id, name, office, home, skills: [codes] | "*", from?, to?, offDays: [dow], offSlots: [{ dow, time }] }] */
    overrides: {},       /* { "YYYY-MM-DD": { repId: "off" | ["14:00", ...] (off slots) } } */
    setters: [],         /* [{ name, initials }] */
    sample: { pastDays: 21, futureDays: 10, phonePrefix: "555-01" }
  };
  function merge(a, b) { var o = {}; Object.keys(a).forEach(function (k) { o[k] = a[k]; }); Object.keys(b || {}).forEach(function (k) { o[k] = (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) ? merge(a[k], b[k]) : b[k]; }); return o; }
  var current = TEMPLATE;
  window.FutureBoardConfig = {
    template: TEMPLATE,
    define: function (cfg) { current = merge(TEMPLATE, cfg); return current; },
    get: function () { return current; }
  };
})();
