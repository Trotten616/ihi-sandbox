/* Generic tenant template. A company is onboarded by shipping its own config/tenant-<name>.js that calls
 * IHITenant.apply({...}) with the same shape. Nothing company-specific lives in this file. */
(function () {
  "use strict";
  var ROLE = {
    marketer:   { role: "Setter", roleLabel: "Marketer", marketer: true },
    confirmer:  { role: "Confirmer", roleLabel: "Confirmer" },
    dataproc:   { role: "Data processor", roleLabel: "Data processor" },
    rep:        { role: "Rep", roleLabel: "Sales rep", rep: true },
    manager:    { role: "Manager", roleLabel: "Manager" }
  };
  function slug(n) { return n.toLowerCase().replace(/[^a-z]+/g, "."); }
  window.IHITenant = {
    config: null,
    ROLE: ROLE,
    apply: function (cfg) {
      this.config = cfg;
      var S = window.SampleData; if (!S) return;
      var users = (cfg.users || []).map(function (u) {
        var r = ROLE[u.role] || ROLE.marketer;
        var parts = u.name.split(" ");
        return Object.assign({ id: u.id, name: u.name, email: slug(u.name) + "@example.com",
          initials: parts.map(function (p) { return p[0]; }).join("").slice(0, 3).toUpperCase(),
          officeDefault: u.office || cfg.defaultOffice || "MI", division: u.division || "", tenantRole: u.role },
          r, u.title ? { roleLabel: u.title } : {}, u.role === "rep" ? { salesperson: u.name, salespersonId: "sp-" + u.id.replace(/^u-/, "") } : {});
      });
      /* tenant staff first; other built-in sample people stay (their sample data refers to them) but are
         marked offTenant so the user switcher and sign-in list hide them */
      var ids = users.map(function (u) { return u.id; });
      var rest = (S.users || []).filter(function (u) { return ids.indexOf(u.id) < 0; }).map(function (u) { return Object.assign({}, u, { offTenant: true }); });
      S.users = users.concat(rest);
      var reps = users.filter(function (u) { return u.rep; });
      (S.boardReps || []).forEach(function (b, i) { if (reps[i]) b.name = reps[i].name; });
      if (S.boardReps && reps.length) S.boardReps = S.boardReps.slice(0, Math.max(reps.length, 1));
      if (S.boardDays) S.boardDays.forEach(function (d) { d.slots.forEach(function (s) { s.cells = s.cells.slice(0, S.boardReps.length); }); });
      if (cfg.companyName) document.documentElement.setAttribute("data-tenant", cfg.id || "");
    },
    users: function (role) { var u = (window.SampleData && SampleData.users) || []; return role ? u.filter(function (x) { return x.tenantRole === role; }) : u; },
    products: function () { return (this.config && this.config.products) || []; }
  };
})();
