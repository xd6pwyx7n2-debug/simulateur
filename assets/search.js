/* SimuDroit : recherche instantanée (index local, aucune donnée envoyée). */
(function(){
"use strict";
var inp=document.getElementById("site-q"); if(!inp)return;
var list=document.getElementById("site-q-list"), live=document.getElementById("site-q-live"), idx=null, loading=false, act=-1, res=[];
function norm(t){return String(t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[’']/g," ").replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();}
function load(cb){
  if(idx)return cb(); if(loading)return; loading=true;
  fetch("/assets/search-index.json").then(function(r){return r.json();}).then(function(j){
    idx=j.map(function(x){return{t:x[0],d:x[1],u:x[2],k:x[3],nt:norm(x[0]),nd:norm(x[1]),nk:norm(x[4]+" "+x[3]+" "+x[2].replace(/[\/-]/g," "))};});
    cb();
  }).catch(function(){loading=false;});
}
function search(q){
  var toks=norm(q).split(" ").filter(Boolean); if(!toks.length)return[];
  var out=[];
  idx.forEach(function(p){
    var s=0;
    for(var i=0;i<toks.length;i++){
      var w=toks[i], sc=0;
      if(p.nt.indexOf(w)===0||p.nt.indexOf(" "+w)>=0)sc=Math.max(sc,10); else if(p.nt.indexOf(w)>=0)sc=Math.max(sc,7);
      if(p.nk.indexOf(" "+w)>=0||p.nk.indexOf(w)===0)sc=Math.max(sc,8); else if(p.nk.indexOf(w)>=0)sc=Math.max(sc,5);
      if(p.nd.indexOf(w)>=0)sc=Math.max(sc,3);
      if(!sc){s=0;return;} s+=sc;
    }
    if(s&&p.nt.indexOf(norm(q))>=0)s+=6;
    if(s&&(p.k==="Simulateur"||p.k==="Outil"))s+=1.5;
    if(s)out.push([s,p]);
  });
  out.sort(function(a,b){return b[0]-a[0]||a[1].t.length-b[1].t.length;});
  return out.slice(0,8).map(function(x){return x[1];});
}
function esc(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function show(){
  var q=inp.value.trim(); act=-1; list.innerHTML="";
  if(q.length<2){close();return;}
  res=search(q);
  if(!res.length){list.innerHTML='<li class="sq-none" role="presentation">Aucun résultat pour « '+esc(q)+' ». Essayez un mot plus simple : licenciement, congés, CV, retraite…</li>';open();live.textContent="Aucun résultat";return;}
  res.forEach(function(p,i){var li=document.createElement("li");li.id="sq-"+i;li.setAttribute("role","option");li.innerHTML='<a href="'+p.u+'" tabindex="-1"><span class="sq-k">'+esc(p.k)+'</span><span class="sq-t">'+esc(p.t)+'</span></a>';list.appendChild(li);});
  open();live.textContent=res.length+" résultat"+(res.length>1?"s":"")+" disponibles";
}
function open(){list.hidden=false;inp.setAttribute("aria-expanded","true");}
function close(){list.hidden=true;inp.setAttribute("aria-expanded","false");inp.removeAttribute("aria-activedescendant");}
function mark(i){
  var o=list.querySelectorAll('[role="option"]');for(var j=0;j<o.length;j++)o[j].classList.toggle("on",j===i);
  act=i;if(i>=0&&o[i]){inp.setAttribute("aria-activedescendant",o[i].id);o[i].scrollIntoView({block:"nearest"});}else inp.removeAttribute("aria-activedescendant");
}
inp.addEventListener("input",function(){load(show);});
inp.addEventListener("focus",function(){load(function(){if(inp.value.trim().length>=2)show();});});
inp.addEventListener("keydown",function(e){
  if(e.key==="ArrowDown"){e.preventDefault();if(list.hidden)show();if(res.length)mark((act+1)%res.length);}
  else if(e.key==="ArrowUp"){e.preventDefault();if(res.length)mark(act<=0?res.length-1:act-1);}
  else if(e.key==="Enter"){e.preventDefault();var p=res[act>=0?act:0];if(p)location.href=p.u;}
  else if(e.key==="Escape"){close();}
});
document.addEventListener("click",function(e){if(!e.target.closest||!e.target.closest(".site-search"))close();});
document.getElementById("site-q-form").addEventListener("submit",function(e){e.preventDefault();var p=res[act>=0?act:0];if(p)location.href=p.u;});
if(location.hash==="#recherche"){setTimeout(function(){inp.scrollIntoView({block:"center"});inp.focus();},50);}
window.addEventListener("hashchange",function(){if(location.hash==="#recherche")inp.focus();});
})();
