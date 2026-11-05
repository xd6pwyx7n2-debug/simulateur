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
var STOP=" le la les un une des de du d l a au aux en et ou pour par sur sous avec sans mon ma mes ton ta tes son sa ses notre nos votre vos je j me m moi vais veux voudrais souhaite souhaiterais vas peux puis dois combien comment quand quel quelle quels quelles est ce c ca que qu quoi apres avant si y il elle on nous vous ils pas ne n se s t sont etre avoir faire fait cas suite pendant lors ai as ont suis ";
var SYN={demissionner:["demission","preavis"],demissionne:["demission","preavis"],licencier:["licenciement"],licencie:["licenciement"],toucher:["indemnite","allocation"],touche:["indemnite","allocation"],percevoir:["indemnite","allocation"],recevoir:["indemnite","allocation"],gagne:["salaire"],gagner:["salaire"],paye:["salaire"],remuneration:["salaire"],quitter:["demission","rupture"],partir:["demission","rupture","retraite"],virer:["licenciement"],vire:["licenciement"],chomeur:["chomage"],argent:["epargne"],placer:["epargne","placement"],pret:["credit","immobilier"],acheter:["immobilier"],maison:["immobilier"],appartement:["immobilier"],louer:["loyer","logement"],bebe:["maternite","naissance"],enfant:["maternite","naissance","paternite"],enceinte:["maternite"],malade:["maladie","arret"],arret:["maladie"],cv:["cv"],lettre:["modele"]};
var BOOST=[[/rupture conventionnelle|rupco/,{"/simulateur-rupture-conventionnelle/":8}],[/demissionn|quitter (mon )?(emploi|poste|travail)/,{"/simulateur-preavis-demission/":18,"/guides/demission-et-chomage-droits/":12}]];
function search(q){
  var all=norm(q).split(" ").filter(Boolean),toks=all.filter(function(w){return STOP.indexOf(" "+w+" ")<0;});
  if(!toks.length)toks=all; if(!toks.length)return[];
  var need=toks.length<3?toks.length:Math.ceil(toks.length*0.5);
  var out=[];
  function sc1(p,w){var sc=0;
    if(p.nt.indexOf(w)===0||p.nt.indexOf(" "+w)>=0)sc=Math.max(sc,10); else if(p.nt.indexOf(w)>=0)sc=Math.max(sc,7);
    if(p.nk.indexOf(" "+w)>=0||p.nk.indexOf(w)===0)sc=Math.max(sc,8); else if(p.nk.indexOf(w)>=0)sc=Math.max(sc,5);
    if(p.nd.indexOf(w)>=0)sc=Math.max(sc,3);
    return sc;}
  idx.forEach(function(p){
    var s=0,hit=0;
    for(var i=0;i<toks.length;i++){
      var w=toks[i],sc=sc1(p,w),sy=SYN[w]||[];
      for(var j=0;j<sy.length;j++)sc=Math.max(sc,sc1(p,sy[j])*0.8);
      if(sc){s+=sc;hit++;}
    }
    if(hit<need)return;
    if(hit===toks.length)s+=4;
    var nq=toks.join(" ");if(s&&p.nt.indexOf(norm(q))>=0)s+=6;else if(s&&toks.length>1&&(p.nt.indexOf(nq)>=0||p.nk.indexOf(nq)>=0))s+=6;
    if(s&&/employeur/.test(p.u)&&!/employeur|cout|patronal|embauch|mes salaries/.test(norm(q)))s-=14;
    if(s)for(var b=0;b<BOOST.length;b++)if(BOOST[b][0].test(norm(q))&&BOOST[b][1][p.u])s+=BOOST[b][1][p.u];
    if(s&&(p.k==="Simulateur"||p.k==="Outil"))s+=4;
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
