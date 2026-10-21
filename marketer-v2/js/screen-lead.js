(function(){ window.MARKETER_SCREENS=window.MARKETER_SCREENS||{};
var FIELDS=[["phone","Phone"],["city","City"],["product","Product"],["source","Source"],["status","Status"],["notes","Notes"]];
window.MARKETER_SCREENS.lead={render:function(el,st,id){
  var S=window.MarketerState, l=S.ensureLead(id), D=window.MARKETER_DATA; if(!l){el.innerHTML='<p class="m-pad">Lead not found.</p>';return;}
  var tom=new Date(Date.now()+864e5), dstr=tom.toISOString().slice(0,10);
  el.innerHTML='<section class="m-pad" data-testid="screen-lead"><button class="btn btn-sm" data-testid="lead-back" data-nav="queue">← Queue</button>'+
    '<h2 data-testid="lead-name">'+MU.esc(l.name)+'</h2>'+(MU.inWindow(l)?'':'<div class="m-warn" data-testid="window-warn">Outside the 9 AM–9 PM calling window in the lead\'s time zone. Don\'t dial now.</div>')+
    '<div class="m-card m-grid">'+FIELDS.map(function(f){return '<div><small>'+f[1]+'</small><b>'+MU.esc(l[f[0]]||"—")+'</b></div>';}).join("")+'</div>'+
    '<div class="m-row"><button class="btn btn-primary" data-testid="btn-log-call">Log a call</button><button class="btn" data-testid="btn-set-appt">Set appointment</button></div>'+
    '<form class="m-card" data-testid="form-call" hidden><h3>Log a call</h3><label>Result <select class="input" data-testid="result-select">'+D.dispositions.map(function(r){return '<option>'+r+'</option>';}).join("")+'</select></label>'+
      '<label data-testid="cb-wrap" hidden>Callback at <input class="input" type="datetime-local" data-testid="cb-at" value="'+dstr+'T10:00"></label>'+
      '<label>Note <input class="input" data-testid="call-note" placeholder="Optional"></label><button type="submit" class="btn btn-primary" data-testid="btn-save-call">Save call</button></form>'+
    '<form class="m-card" data-testid="form-appt" hidden><h3>Set appointment</h3><div class="m-grid">'+
      '<label>Date <input class="input" type="date" data-testid="appt-date" value="'+dstr+'"></label><label>Time <input class="input" type="time" data-testid="appt-time" value="18:00"></label>'+
      '<label>Rep <select class="input" data-testid="appt-rep">'+D.reps.map(function(r){return '<option>'+MU.esc(r)+'</option>';}).join("")+'</select></label>'+
      '<label>Product <input class="input" data-testid="appt-product" value="'+MU.esc(l.product)+'"></label></div><p class="m-warn" data-testid="appt-warn" hidden></p>'+
      '<button type="submit" class="btn btn-primary" data-testid="btn-save-appt">Book appointment</button></form>'+
    '<div class="m-card"><h3>History</h3><ul class="m-hist" data-testid="lead-history">'+(l.history.map(function(h){return '<li><b>'+MU.esc(h.result)+'</b> <small>'+MU.fmt(h.at)+' · '+MU.esc(h.by)+'</small><br>'+MU.esc(h.note)+'</li>';}).join("")||'<li class="muted">No activity yet.</li>')+'</ul></div></section>';
  var q=function(t){return el.querySelector('[data-testid="'+t+'"]');};
  q("btn-log-call").onclick=function(){q("form-call").hidden=false;q("form-appt").hidden=true;};
  q("btn-set-appt").onclick=function(){q("form-appt").hidden=false;q("form-call").hidden=true;check();};
  q("result-select").onchange=function(){var r=this.value;q("cb-wrap").hidden=r!=="Callback";if(r==="Appointment set"){q("form-appt").hidden=false;}};
  q("form-call").onsubmit=function(e){e.preventDefault();var r=q("result-select").value;
    S.logCall(l.id,r,q("call-note").value); if(r==="Callback") S.setCallback(l.id,new Date(q("cb-at").value).toISOString(),q("call-note").value);
    MU.toast("Logged: "+r); MU.open(l.id); };
  function when(){return new Date(q("appt-date").value+"T"+q("appt-time").value).getTime();}
  function check(){var t=when(),w=q("appt-warn"),bad=!isNaN(t)&&!MU.inWindow(l,t);w.hidden=!bad;w.textContent=bad?"Heads up: that time is outside 9 AM–9 PM in the lead's time zone.":"";return !bad;}
  q("appt-date").onchange=q("appt-time").onchange=check;
  q("form-appt").onsubmit=function(e){e.preventDefault();var t=when(); if(isNaN(t)){MU.toast("Pick a date and time");return;}
    if(!check()&&!confirm("Outside the lead's 9 AM–9 PM window. Book anyway?"))return;
    S.setAppt(l.id,new Date(t).toISOString(),q("appt-rep").value,q("appt-product").value); MU.toast("Appointment set"); MU.open(l.id); };
}}; })();
