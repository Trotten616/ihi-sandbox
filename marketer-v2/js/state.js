/* MarketerState: localStorage-backed state seeded from window.MARKETER_DATA. */
(function(){
  var KEY="mkt:state:v1", subs=[];
  function seed(){ var s=JSON.parse(JSON.stringify(window.MARKETER_DATA)); s.appts=[]; return s; }
  function load(){ try{var s=JSON.parse(localStorage.getItem(KEY)); if(s&&s.leads) return s;}catch(e){} return seed(); }
  var st=load();
  function save(){ localStorage.setItem(KEY,JSON.stringify(st)); subs.slice().forEach(function(f){try{f(st);}catch(e){}}); }
  function rate(){ st.stats.setRate=st.stats.contacts?Math.round(st.stats.appts/st.stats.contacts*100):0; }
  function bucket(field){ var h=new Date().getHours(), b=st.stats.byHour.filter(function(x){return x.hour===h;})[0];
    if(!b){ b={hour:h,dials:0,contacts:0,appts:0}; st.stats.byHour.push(b); st.stats.byHour.sort(function(a,c){return a.hour-c.hour;}); } b[field]=(b[field]||0)+1; }
  var CONTACT=["Not interested","Callback","Appointment set"];
  var STATUS={"Not interested":"Not interested","Callback":"Callback","Appointment set":"Appointment set","Wrong number":"Bad number","DNC":"DNC"};
  window.MarketerState={
    get:function(){return st;},
    subscribe:function(f){subs.push(f);return function(){subs=subs.filter(function(x){return x!==f;});};},
    lead:function(id){return st.leads.filter(function(l){return l.id===id;})[0]||null;},
    ensureLead:function(id){ var l=this.lead(id); if(l) return l; var s=(st.stl||[]).filter(function(x){return x.id===id;})[0]; if(!s) return null;
      l={id:s.id,name:s.name,phone:s.phone,city:s.city,source:s.source,product:s.product,status:"New",createdAt:s.receivedAt,notes:"New inbound lead",history:[]}; st.leads.unshift(l); save(); return l; },
    logCall:function(id,result,note){ var l=this.ensureLead(id); var by=window.MARKETER_NAME;
      st.stats.dials++; bucket("dials"); if(CONTACT.indexOf(result)>=0){ st.stats.contacts++; bucket("contacts"); }
      l.history.unshift({at:new Date().toISOString(),by:by,result:result,note:note||""}); l.lastContact=new Date().toISOString();
      l.status=STATUS[result]||(l.status==="New"?"Attempting":l.status);
      st.stl=(st.stl||[]).filter(function(s){return s.id!==id;}); rate(); save(); },
    setCallback:function(id,dueAt,reason){ var l=this.lead(id); st.callbacks=st.callbacks.filter(function(c){return c.leadId!==id;});
      st.callbacks.push({id:"CB"+Date.now(),leadId:id,name:l.name,phone:l.phone,dueAt:dueAt,reason:reason||"Callback"}); save(); },
    setAppt:function(id,at,rep,product){ var l=this.lead(id); st.appts.push({leadId:id,at:at,rep:rep,product:product});
      st.stats.appts++; bucket("appts"); l.status="Appointment set";
      l.history.unshift({at:new Date().toISOString(),by:window.MARKETER_NAME,result:"Appointment set",note:product+" with "+rep+" on "+new Date(at).toLocaleString()});
      rate(); save(); },
    reset:function(){ localStorage.removeItem(KEY); st=seed(); save(); }
  };
})();
