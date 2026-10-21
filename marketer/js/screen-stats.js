// My Daily Stats screen. Sample data only. Plain SVG chart.
(function(){
  window.MARKETER_SCREENS = window.MARKETER_SCREENS || {};
  function stats(state){
    var S=window.MarketerState, s=state||(S&&typeof S.get==='function'?S.get():null);
    return (s&&s.stats)||((window.MARKETER_DATA||{}).stats)||{dials:0,contacts:0,appts:0,setRate:0,byHour:[]};
  }
  function hourLabel(h){var p=h<12?'a':'p',x=h%12||12;return x+p;}
  function chart(by){
    var W=360,H=180,pad=24,n=Math.max(by.length,1),max=1;
    by.forEach(function(b){if((b.dials||0)>max)max=b.dials;});
    var bw=(W-pad*2)/n, s='<svg data-testid="stats-chart" viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="Dials by hour" style="max-width:520px">';
    for(var g=0;g<=4;g++){var y=pad+(H-pad*2)*g/4; s+='<line x1="'+pad+'" x2="'+(W-pad)+'" y1="'+y+'" y2="'+y+'" stroke="var(--chart-grid, var(--border))" stroke-width="1"/>';}
    by.forEach(function(b,i){
      var v=b.dials||0,bh=(H-pad*2)*v/max,x=pad+i*bw+bw*0.15,y=H-pad-bh,w=bw*0.7;
      s+='<rect data-testid="stats-bar" x="'+x+'" y="'+y+'" width="'+w+'" height="'+bh+'" rx="3" fill="var(--chart-1, var(--primary))"><title>'+hourLabel(b.hour)+': '+v+' dials</title></rect>'+
        '<text x="'+(x+w/2)+'" y="'+(y-4)+'" text-anchor="middle" font-size="11" fill="var(--text)">'+v+'</text>'+
        '<text x="'+(x+w/2)+'" y="'+(H-pad+14)+'" text-anchor="middle" font-size="11" fill="var(--text-muted)">'+hourLabel(b.hour)+'</text>';
    });
    return s+'</svg>';
  }
  function card(id,label,val){return '<div style="padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg-elevated)"><div style="color:var(--text-muted);font-size:.85em">'+label+'</div><div data-testid="'+id+'" style="font-size:1.8em;font-weight:700">'+val+'</div></div>';}
  var unsub=null;
  window.MARKETER_SCREENS.stats = {
    render: function(el, state){
      if(unsub){try{unsub();}catch(e){} unsub=null;}
      function draw(st){
        var d=stats(st), rate=d.setRate!=null?d.setRate:(d.contacts?Math.round(d.appts/d.contacts*100):0);
        el.innerHTML='<section data-testid="screen-stats" style="padding:16px;color:var(--text)"><h2 style="margin:0 0 12px">My Daily Stats</h2>'+
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:16px">'+
          card('stat-dials','Dials',d.dials||0)+card('stat-contacts','Contacts',d.contacts||0)+card('stat-appts','Appointments set',d.appts||0)+card('stat-setrate','Set rate',(rate||0)+'%')+
          '</div><h3 style="margin:0 0 8px;font-size:1em">Dials by hour</h3>'+chart(d.byHour||[])+'</section>';
      }
      draw(state);
      var S=window.MarketerState;
      if(S&&typeof S.subscribe==='function'){ var u=S.subscribe(function(st){ if(el.isConnected&&el.querySelector('[data-testid="screen-stats"]')) draw(st); }); if(typeof u==='function') unsub=u; }
    }
  };
})();
