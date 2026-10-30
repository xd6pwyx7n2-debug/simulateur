(function(){var q=document.getElementById('ad-q'),cards=[].slice.call(document.querySelectorAll('.ad-card')),secs=[].slice.call(document.querySelectorAll('.ad-sec')),chips=[].slice.call(document.querySelectorAll('.ad-chips button')),cnt=document.getElementById('ad-count'),em=document.getElementById('ad-empty');var sel='';
function norm(s){return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}
function run(){var t=norm(q.value.trim()),n=0;cards.forEach(function(c){var ok=(!sel||c.dataset.t.split(' ').indexOf(sel)>-1)&&(!t||norm(c.textContent).indexOf(t)>-1);c.hidden=!ok;if(ok)n++});secs.forEach(function(s){s.hidden=!s.querySelector('.ad-card:not([hidden])')});cnt.textContent=n+' aide'+(n>1?'s':'')+' affichée'+(n>1?'s':'')+' sur '+cards.length;em.hidden=n>0}
chips.forEach(function(b){b.addEventListener('click',function(){sel=b.dataset.s;chips.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});run();try{history.replaceState(null,'',sel?'#'+sel:location.pathname)}catch(e){}})});
q.addEventListener('input',run);
var h=(location.hash||'').slice(1);if(h){var b=chips.filter(function(x){return x.dataset.s===h})[0];if(b)b.click()}else run();})();
