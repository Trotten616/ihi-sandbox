/* Runs before first paint: theme only. */
(function () {
  var t = "system";
  try { t = localStorage.getItem("ig.theme") || "system"; } catch (e) {}
  var dark = t === "dark" || (t === "system" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  if (window.IG_CONFIG && IG_CONFIG.mode === "sandbox") document.documentElement.classList.add("sandbox");
})();
