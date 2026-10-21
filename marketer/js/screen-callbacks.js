(function(){ window.MARKETER_SCREENS=window.MARKETER_SCREENS||{};
window.MARKETER_SCREENS.callbacks={render:function(el,st){
  var now=Date.now(), cb=st.callbacks.slice().sort(function(a,b){return Date.parse(a.dueAt)-Date.parse(b.dueAt);});
  el.innerHTML='<section class="m-pad" data-testid="screen-callbacks"><h2>Callbacks</h2><div class="m-list">'+(cb.map(function(c){var od=Date.parse(c.dueAt)<=now;
    return '<button type="button" class="m-item" data-testid="callback-row" data-lead-id="'+c.leadId+'"><span class="m-main"><b>'+MU.esc(c.name)+'</b>\n<small>'+MU.fmt(c.dueAt)+' · '+MU.esc(c.reason||"")+'</small></span><span class="m-tag '+(od?"m-over":"m-due")+'">'+(od?"Overdue":"Due")+'</span></button>';}).join("")||'<p class="muted">No callbacks.</p>')+'</div></section>';
  el.querySelectorAll('[data-testid="callback-row"]').forEach(function(b){b.onclick=function(){MU.open(b.dataset.leadId);};});
}}; })();
