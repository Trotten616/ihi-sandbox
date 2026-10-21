(function(){
  var U=window.MU={};
  U.esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  U.fmt=function(t){return new Date(t).toLocaleString([], {weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});};
  U.ago=function(t){var m=Math.max(0,Math.round((Date.now()-Date.parse(t))/60000)); return m<60?m+"m ago":m<1440?Math.floor(m/60)+"h ago":Math.floor(m/1440)+"d ago";};
  /* Lead-local time zone: sample leads are West Michigan; a lead can override with lead.tz (IANA). */
  U.tz=function(l){return l.tz||"America/Detroit";};
  U.localHour=function(l,t){return +new Intl.DateTimeFormat("en-US",{hour:"numeric",hourCycle:"h23",timeZone:U.tz(l)}).format(new Date(t||Date.now()));};
  U.inWindow=function(l,t){var h=U.localHour(l,t);return h>=9&&h<21;};
  U.open=function(id){document.dispatchEvent(new CustomEvent('marketer:open-lead',{detail:{leadId:id}}));};
  U.toast=function(m){var t=document.getElementById("toast");t.textContent=m;t.hidden=false;clearTimeout(U._t);U._t=setTimeout(function(){t.hidden=true;},2200);};
})();
