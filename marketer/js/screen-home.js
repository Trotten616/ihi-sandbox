(function(){ window.MARKETER_SCREENS=window.MARKETER_SCREENS||{};
window.MARKETER_SCREENS.home={render:function(el,st){
  var s=st.stats, now=Date.now(), od=st.callbacks.filter(function(c){return Date.parse(c.dueAt)<=now;}).length;
  var k=function(id,lab,v,go){return '<button type="button" class="m-kpi" data-testid="'+id+'" data-nav="'+go+'"><b>'+v+'</b><span>'+lab+'</span></button>';};
  el.innerHTML='<section class="m-pad" data-testid="screen-home"><h2>Today</h2><p class="muted">Welcome back, '+MU.esc(window.MARKETER_NAME.split(" ")[0])+'. Sample shift data.</p><div class="m-kpis">'+
    k("home-dials","Dials",s.dials,"stats")+k("home-contacts","Contacts",s.contacts,"stats")+k("stat-appts","Appointments set",s.appts,"stats")+k("home-setrate","Set rate",s.setRate+"%","stats")+
    k("home-stl","New leads waiting",(st.stl||[]).length,"stl")+k("home-overdue","Callbacks overdue",od,"callbacks")+
    '</div><div class="m-row"><button class="btn btn-primary" data-testid="home-start" data-nav="queue">Start my queue</button><button class="btn" data-nav="stl">Speed to Lead</button></div></section>';
}}; })();
