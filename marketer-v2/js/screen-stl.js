// Speed to Lead screen. Sample data only.
(function(){
  window.MARKETER_SCREENS = window.MARKETER_SCREENS || {};
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function data(state){
    var S=window.MarketerState, s=state||(S&&typeof S.get==='function'?S.get():null);
    return (s&&s.stl)||((window.MARKETER_DATA||{}).stl)||[];
  }
  function recv(l){ if(l.receivedAt){var t=Date.parse(l.receivedAt); if(!isNaN(t)) return t;} return Date.now()-(l.minutesAgo||0)*60000; }
  function fmt(ms){var m=Math.max(0,Math.floor(ms/60000)); if(m<60) return m+'m'; var h=Math.floor(m/60); return h+'h '+(m%60)+'m';}
  function color(ms){var m=ms/60000; return m<5?'var(--success)':m<15?'var(--m-amber, #d97706)':'var(--danger)';}
  var timer=null, unsub=null;
  window.MARKETER_SCREENS.stl = {
    render: function(el, state){
      if(timer){clearInterval(timer);timer=null;}
      if(unsub){try{unsub();}catch(e){} unsub=null;}
      var oldestFirst=true;
      function draw(st){
        var list=data(st).slice().sort(function(a,b){return oldestFirst?recv(a)-recv(b):recv(b)-recv(a);});
        var h='<section data-testid="screen-stl" style="padding:16px;color:var(--text)">'+
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">'+
          '<h2 style="margin:0">Speed to Lead</h2>'+
          '<button type="button" data-testid="stl-sort" style="padding:6px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text);cursor:pointer">Sort: '+(oldestFirst?'Oldest first':'Newest first')+'</button></div>'+
          '<p style="color:var(--text-muted);margin:4px 0 12px">New inbound leads. Call within 5 minutes.</p>';
        if(!list.length) h+='<p data-testid="stl-empty" style="color:var(--text-muted)">No new leads right now.</p>';
        h+='<ul style="list-style:none;margin:0;padding:0;display:grid;gap:8px">';
        list.forEach(function(l){
          var age=Date.now()-recv(l);
          h+='<li data-testid="stl-item" data-lead-id="'+esc(l.id)+'" style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg-elevated)">'+
            '<span data-testid="stl-age" data-received="'+recv(l)+'" style="min-width:56px;text-align:center;font-weight:700;color:#fff;border-radius:999px;padding:4px 8px;background:'+color(age)+'">'+fmt(age)+'</span>'+
            '<div style="flex:1;min-width:0"><div style="font-weight:600">'+esc(l.name)+'</div>'+
            '<div style="color:var(--text-muted);font-size:.9em">'+esc(l.product)+' · '+esc(l.city)+' · '+esc(l.source)+'</div></div>'+
            '<button type="button" data-testid="stl-call" data-lead-id="'+esc(l.id)+'" style="padding:8px 14px;border:0;border-radius:8px;background:var(--primary);color:#fff;font-weight:600;cursor:pointer">Call now</button></li>';
        });
        el.innerHTML=h+'</ul></section>';
        el.querySelector('[data-testid="stl-sort"]').onclick=function(){oldestFirst=!oldestFirst;draw();};
        Array.prototype.forEach.call(el.querySelectorAll('[data-testid="stl-call"]'),function(b){
          b.onclick=function(){document.dispatchEvent(new CustomEvent('marketer:open-lead',{bubbles:true,detail:{leadId:b.getAttribute('data-lead-id')}}));};
        });
      }
      draw(state);
      timer=setInterval(function(){
        if(!el.isConnected||!el.querySelector('[data-testid="screen-stl"]')){clearInterval(timer);timer=null;return;}
        Array.prototype.forEach.call(el.querySelectorAll('[data-testid="stl-age"]'),function(s){
          var age=Date.now()-Number(s.getAttribute('data-received')); s.textContent=fmt(age); s.style.background=color(age);
        });
      },1000);
      var S=window.MarketerState;
      if(S&&typeof S.subscribe==='function'){ var u=S.subscribe(function(st){ if(el.querySelector('[data-testid="screen-stl"]')) draw(st); }); if(typeof u==='function') unsub=u; }
    }
  };
})();
