/* Agent Platform inside the IntelliGro.AI Home Base Command Center (SANDBOX, added by make-home-base.sh).
   - light/dark follows the Command Center page this frame sits in (same origin)
   - the "coming soon" quick actions become clickable, but only show the sandbox "off here" message: nothing is sent */
(function () {
  "use strict";
  var host = null;
  try { if (window.parent !== window && window.parent.document) host = window.parent.document.documentElement; } catch (e) { host = null; }
  function sync() { document.documentElement.setAttribute("data-theme", host && host.getAttribute("data-theme") === "dark" ? "dark" : "light"); }
  sync();
  if (host && window.MutationObserver) new MutationObserver(sync).observe(host, { attributes: true, attributeFilter: ["data-theme"] });
  function say(msg) { if (window.Sandbox && Sandbox.toast) Sandbox.toast(msg); }
  document.addEventListener("DOMContentLoaded", function () {
    var q = document.getElementById("q"); if (q && window.innerWidth <= 700) q.placeholder = "Search agents or roles…";
    var soon = document.querySelector(".soon"); if (!soon) return;
    var lbl = soon.querySelector(".lbl"); if (lbl) lbl.textContent = "Quick actions (sandbox)";
    soon.querySelectorAll("button[disabled]").forEach(function (b) {
      b.disabled = false; b.setAttribute("data-quick", b.textContent.replace(/^[^A-Za-z]+/, "").trim());
      b.title = "Sandbox: quick actions are off here. Nothing is sent.";
    });
    soon.addEventListener("click", function (e) {
      var b = e.target.closest("[data-quick]"); if (!b) return;
      say("Disabled in sandbox: quick actions are off here (" + b.getAttribute("data-quick") + "). Nothing was sent.");
    });
  });
})();
