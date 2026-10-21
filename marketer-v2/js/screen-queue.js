(function(){ window.MARKETER_SCREENS=window.MARKETER_SCREENS||{}; var f={q:"",status:"",sort:"newest"};
window.MARKETER_SCREENS.queue={render:function(el,st){
  var statuses=[""].concat(Array.from(new Set(st.leads.map(function(l){return l.status;}))).sort());
  var opt=function(v,l,cur){return '<option value="'+v+'"'+(v===cur?" selected":"")+'>'+l+'</option>';};
  el.innerHTML='<section class="m-pad" data-testid="screen-queue"><h2>My lead queue</h2><div class="m-toolbar">'+
    '<input class="input" data-testid="queue-search" placeholder="Search name, city, phone" value="'+MU.esc(f.q)+'">'+
    '<select class="input" data-testid="queue-status">'+statuses.map(function(s){return opt(s,s||"All statuses",f.status);}).join("")+'</select>'+
    '<select class="input" data-testid="queue-sort">'+[["newest","Newest first"],["oldest","Oldest first"],["name","Name A–Z"],["attempts","Fewest attempts"]].map(function(o){return opt(o[0],o[1],f.sort);}).join("")+'</select></div><div class="m-list" data-testid="queue-list"></div></section>';
  var list=el.querySelector('[data-testid="queue-list"]');
  function draw(){ var q=f.q.toLowerCase();
    var rows=st.leads.filter(function(l){return (!f.status||l.status===f.status)&&(!q||(l.name+" "+l.city+" "+l.phone).toLowerCase().indexOf(q)>=0);});
    rows.sort(function(a,b){var ta=Date.parse(a.createdAt),tb=Date.parse(b.createdAt);return f.sort==="newest"?tb-ta:f.sort==="oldest"?ta-tb:f.sort==="name"?a.name.localeCompare(b.name):a.history.length-b.history.length;});
    list.innerHTML=rows.map(function(l){return '<button type="button" class="m-item" data-testid="lead-row" data-lead-id="'+l.id+'"><span class="m-main"><b>'+MU.esc(l.name)+'</b>\n<small>'+MU.esc(l.product+" · "+l.city+" · "+l.source)+'</small></span><span class="m-tag">'+MU.esc(l.status)+'</span></button>';}).join("")||'<p class="muted">No leads match.</p>';
    list.querySelectorAll('[data-testid="lead-row"]').forEach(function(b){b.onclick=function(){MU.open(b.dataset.leadId);};});
  }
  el.querySelector('[data-testid="queue-search"]').oninput=function(e){f.q=e.target.value;draw();};
  el.querySelector('[data-testid="queue-status"]').onchange=function(e){f.status=e.target.value;draw();};
  el.querySelector('[data-testid="queue-sort"]').onchange=function(e){f.sort=e.target.value;draw();};
  draw();
}}; })();
