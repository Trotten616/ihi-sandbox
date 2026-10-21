/* Router + shell. Add a screen: create js/screen-x.js registering MARKETER_SCREENS.x, add it to NAV and index.html. */
(function(){
  var NAV=[["home","🏠","Home"],["queue","📋","My queue"],["callbacks","⏰","Callbacks"],["stl","⚡","Speed to Lead"],["stats","📊","My stats"]];
  var view, cur;
  function go(id,arg){ cur=[id,arg]; view.innerHTML=""; window.MARKETER_SCREENS[id].render(view,window.MarketerState.get(),arg);
    document.querySelectorAll("[data-testid^=nav-]").forEach(function(b){b.classList.toggle("active",b.dataset.nav===id||(id==="lead"&&b.dataset.nav==="queue"));});
    window.scrollTo(0,0); }
  window.MarketerRouter={go:go};
  document.addEventListener("marketer:open-lead",function(e){go("lead",e.detail.leadId);});
  document.addEventListener("DOMContentLoaded",function(){
    view=document.getElementById("m-view");
    var th=localStorage.getItem("mkt:theme")||"light"; document.documentElement.setAttribute("data-theme",th);
    document.querySelectorAll("[data-mkt-name]").forEach(function(n){n.textContent=window.MARKETER_NAME;});
    document.getElementById("m-avatar").textContent=window.MARKETER_NAME.split(" ").map(function(w){return w[0];}).join("");
    var nav=NAV.map(function(n){return '<button type="button" data-testid="nav-'+n[0]+'" data-nav="'+n[0]+'"><span>'+n[1]+'</span> <em>'+n[2]+'</em></button>';}).join("");
    document.getElementById("m-side").innerHTML=nav; document.getElementById("m-tabs").innerHTML=nav;
    document.addEventListener("click",function(e){var b=e.target.closest("[data-nav]");if(b){e.preventDefault();go(b.dataset.nav);}});
    document.querySelector('[data-testid="theme-toggle"]').onclick=function(){var n=document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark";document.documentElement.setAttribute("data-theme",n);localStorage.setItem("mkt:theme",n);};
    document.querySelector('[data-testid="btn-reset"]').onclick=function(){if(confirm("Reset the marketer sample data?")){window.MarketerState.reset();go("home");MU.toast("Sample data reset");}};
    go("home");
  });
})();
