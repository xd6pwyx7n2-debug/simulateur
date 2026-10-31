/* SimuDroit : générateur de CV. Tout se passe dans le navigateur ; rien n'est envoyé. */
(function(){
"use strict";
var $=function(s,r){return (r||document).querySelector(s);}, $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
var KEY="sd-cv-v1", FIELDS=["prenom","nom","titre","email","tel","ville","web","profil","comp","langues","interets","permis"];
var memOn=false, seed=0, hist=[], expN=0, eduN=0;
function E(t){return String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
/* ---------- aléatoire reproductible ---------- */
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hsl(h,s,l){s/=100;l/=100;var k=function(n){return(n+h/30)%12;},a=s*Math.min(l,1-l),f=function(n){return l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));};return[Math.round(255*f(0)),Math.round(255*f(8)),Math.round(255*f(4))];}
function lum(c){var v=c.map(function(x){x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4);});return .2126*v[0]+.7152*v[1]+.0722*v[2];}
function cr(c){return 1.05/(lum(c)+.05);}               /* contraste avec le blanc */
function hex(c){return"#"+c.map(function(x){return("0"+x.toString(16)).slice(-2);}).join("");}
function dark(h,s,l,min){var c=hsl(h,s,l);while(cr(c)<min&&l>8){l-=2;c=hsl(h,s,l);}return c;}
var FONTS=[
 ["Inter","Inter,'Segoe UI',Arial,sans-serif"],["Georgia","Georgia,'Times New Roman',serif"],["Palatino","'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif"],
 ["Trebuchet","'Trebuchet MS','Segoe UI',Arial,sans-serif"],["Verdana","Verdana,Geneva,sans-serif"],["Gill","'Gill Sans','Gill Sans MT',Calibri,Arial,sans-serif"],
 ["Garamond","Garamond,'Palatino Linotype',Georgia,serif"],["Courier","'Courier New',Courier,monospace"]];
var BODY=[0,1,2,3,5,6,0,1,3,4];                          /* polices de texte courantes */
var LAYOUTS=["sl","sl","sr","bd","bd","ce","tl","cd","cd"];
function style(sd){
  var r=rng(sd), p=function(a){return a[Math.floor(r()*a.length)];};
  var h=Math.floor(r()*360), s=62+Math.floor(r()*26), l=24+Math.floor(r()*13);
  var P=dark(h,s,l,7), P2=dark((h+p([14,22,-14,-22,30]) +360)%360,Math.min(95,s+8),Math.max(14,l-9),9);
  var ah=(h+p([150,170,190,210,30,-30,60,-60,120])+360)%360, A=dark(ah,78+Math.floor(r()*18),36+Math.floor(r()*8),4.6), HL=hsl(ah,88+Math.floor(r()*10),52+Math.floor(r()*8));
  var soft=hsl(h,34+Math.floor(r()*40),94+Math.floor(r()*3));
  var hf=p([0,0,3,5,4,1,2,6]), bf=p(BODY);
  var lay=p(LAYOUTS);
  return{seed:sd,lay:lay,hs:Math.floor(r()*6),bu:Math.floor(r()*5),sk:Math.floor(r()*4),jd:Math.floor(r()*3),mono:r()<.6,
    P:hex(P),P2:hex(P2),A:hex(A),HL:hex(HL),soft:hex(soft),hf:FONTS[hf][1],bf:FONTS[bf][1],hfn:FONTS[hf][0],bfn:FONTS[bf][0],
    fs:(9.4+Math.floor(r()*9)/10).toFixed(1)+"pt",rad:p([0,3,6,10,14])+"px",sw:(29+Math.floor(r()*6))+"%"};
}
/* ---------- données ---------- */
function lines(t){return String(t||"").split(/\r?\n/).map(function(x){return x.replace(/^\s*[-•*–]\s*/,"").trim();}).filter(Boolean);}
function list(t){return String(t||"").split(/[\n;,]+/).map(function(x){return x.trim();}).filter(Boolean);}
function collect(){
  var d={};FIELDS.forEach(function(k){var e=document.getElementById("f-"+k);d[k]=e?e.value:"";});
  var g=function(f,k){var e=f.querySelector('[data-k="'+k+'"]');return e?e.value:"";};
  d.exp=$$("#exp-list .cv-rep").map(function(f){return{poste:g(f,"poste"),org:g(f,"org"),lieu:g(f,"lieu"),deb:g(f,"deb"),fin:g(f,"fin"),miss:g(f,"miss")};});
  d.edu=$$("#edu-list .cv-rep").map(function(f){return{dipl:g(f,"dipl"),ecole:g(f,"ecole"),per:g(f,"per"),det:g(f,"det")};});
  return d;
}
function has(d){return d.prenom||d.nom||d.titre||d.profil||d.exp.some(function(x){return x.poste||x.org;})||d.edu.some(function(x){return x.dipl;});}
/* ---------- rendu ---------- */
var SEC={profil:"Profil",exp:"Expériences professionnelles",edu:"Formation",comp:"Compétences",lang:"Langues",int:"Centres d'intérêt",perm:"Informations complémentaires"};
function sec(cls,title,body,wrap){return'<section class="sec '+cls+'"><h2>'+E(title)+'</h2>'+(wrap?'<div class="sb">'+body+'</div>':body)+'</section>';}
function parts(d,tl){
  var P={}, nm=E((d.prenom+" "+d.nom).trim()||"Prénom Nom"), tt=E(d.titre);
  var ct=[];if(d.email)ct.push(E(d.email));if(d.tel)ct.push(E(d.tel));if(d.ville)ct.push(E(d.ville));if(d.web)ct.push(E(d.web));
  P.ctl=ct.map(function(x){return"<li>"+x+"</li>";}).join("");
  P.head='<div class="hd"><h1 class="nm">'+nm+'</h1>'+(tt?'<p class="tt">'+tt+'</p>':"")+'</div>';
  P.nm=nm;P.tt=tt;var ini=((d.prenom||"").trim().charAt(0)+(d.nom||"").trim().charAt(0)).toUpperCase()||"CV";P.mono='<div class="mn" aria-hidden="true">'+E(ini)+'</div>';
  P.profil=d.profil.trim()?sec("s-pro",SEC.profil,"<p>"+E(d.profil).replace(/\n/g,"<br>")+"</p>",tl):"";
  var ex=d.exp.filter(function(x){return x.poste||x.org||x.miss;}).map(function(x){
    var dt=[x.deb,x.fin].filter(Boolean).join(" – "), co=[x.org,x.lieu].filter(Boolean).join(", "), m=lines(x.miss);
    return'<div class="job"><div class="jt"><strong>'+E(x.poste)+'</strong>'+(dt?'<span class="jdt">'+E(dt)+'</span>':"")+(co?'<span class="jc">'+E(co)+'</span>':"")+'</div>'+(m.length?'<ul>'+m.map(function(y){return"<li>"+E(y)+"</li>";}).join("")+'</ul>':"")+'</div>';}).join("");
  P.exp=ex?sec("s-exp",SEC.exp,ex,tl):"";
  var ed=d.edu.filter(function(x){return x.dipl||x.ecole;}).map(function(x){
    var co=[x.ecole,x.per].filter(Boolean).join(", ");
    return'<div class="edu"><div class="jt"><strong>'+E(x.dipl)+'</strong>'+(x.per?'<span class="jdt">'+E(x.per)+'</span>':"")+(x.ecole?'<span class="jc">'+E(x.ecole)+'</span>':"")+'</div>'+(x.det?'<p>'+E(x.det)+'</p>':"")+'</div>';}).join("");
  P.edu=ed?sec("s-edu",SEC.edu,ed,tl):"";
  var cp=list(d.comp);P.comp=cp.length?sec("s-sk",SEC.comp,'<ul class="sk">'+cp.map(function(y){return"<li>"+E(y)+"</li>";}).join("")+"</ul>",tl):"";
  var lg=lines(d.langues);P.lang=lg.length?sec("s-lg",SEC.lang,'<ul class="sk lg">'+lg.map(function(y){return"<li>"+E(y)+"</li>";}).join("")+"</ul>",tl):"";
  var it=list(d.interets);if(d.permis.trim())it.unshift(d.permis.trim());
  P.int=it.length?sec("s-in",d.permis.trim()&&!d.interets.trim()?SEC.perm:SEC.int,'<ul class="sk">'+it.map(function(y){return"<li>"+E(y)+"</li>";}).join("")+"</ul>",tl):"";
  return P;
}
function render(d,st){
  var tl=st.lay==="tl", P=parts(d,tl), body;
  var cls="cv l-"+st.lay+(st.mono?" mono":"")+" hs-"+st.hs+" bu-"+st.bu+" sk-"+st.sk+" jd-"+st.jd;
  var vars="--p:"+st.P+";--p2:"+st.P2+";--a:"+st.A+";--h:"+st.HL+";--soft:"+st.soft+";--hf:"+st.hf+";--bf:"+st.bf+";--fs:"+st.fs+";--r:"+st.rad+";--sw:"+st.sw;
  var ctU='<ul class="ct">'+P.ctl+'</ul>', ctI='<ul class="ct ct-in">'+P.ctl+'</ul>';
  switch(st.lay){
    case"sl":body='<aside class="c-side">'+(st.mono?P.mono:"")+ctU+P.comp+P.lang+P.int+'</aside><div class="c-main">'+P.head+P.profil+P.exp+P.edu+'</div>';break;
    case"sr":body='<div class="c-main">'+P.head+P.profil+P.exp+P.edu+'</div><aside class="c-side">'+(st.mono?P.mono:"")+ctU+P.comp+P.lang+P.int+'</aside>';break;
    case"bd":body='<header class="c-band"><div><h1 class="nm">'+P.nm+'</h1>'+(P.tt?'<p class="tt">'+P.tt+'</p>':"")+'</div>'+ctU+'</header><div class="c-body"><div class="c-main">'+P.profil+P.exp+P.edu+'</div><aside class="c-side">'+P.comp+P.lang+P.int+'</aside></div>';break;
    case"ce":body=P.head+ctI.replace('<ul class="ct ct-in">','<ul class="ct ct-in" style="justify-content:center;margin:-4pt 0 12pt">')+P.profil+P.exp+P.edu+P.comp+P.lang+P.int;break;
    case"tl":body=P.head+ctI.replace('<ul class="ct ct-in">','<ul class="ct ct-in" style="margin:-6pt 0 12pt">')+P.profil+P.exp+P.edu+P.comp+P.lang+P.int;break;
    default:body='<div class="hd">'+'<h1 class="nm">'+P.nm+'</h1>'+(P.tt?'<p class="tt">'+P.tt+'</p>':"")+ctI+'</div><div class="cv-body">'+P.profil+P.exp+P.edu+P.comp+P.lang+P.int+'</div>';
  }
  if(st.lay==="ce"||st.lay==="tl"){/* l'en-tête contient déjà nom et titre ; les coordonnées suivent */
    body=body.replace(/<div class="hd">(.*?)<\/div>(<ul class="ct ct-in"[^>]*>.*?<\/ul>)/,function(m,a,b){return'<div class="hd">'+a+b+'</div>';});
  }
  return'<div class="'+cls+'" style="'+vars+'">'+body+'</div>';
}
/* ---------- interface ---------- */
var stage=$("#cv-stage"), scaleEl=$("#cv-scale"), frame=$("#cv-frame"), live=$("#cv-live"), cur;
function fit(){
  var doc=frame.contentDocument; if(!doc||!doc.documentElement)return;
  var h=Math.max(1123,doc.documentElement.scrollHeight), k=Math.min(1,(stage.clientWidth-24)/793.7);
  frame.style.height=h+"px"; scaleEl.style.transform="scale("+k+")"; scaleEl.style.transformOrigin="top left"; stage.style.height=(h*k+24)+"px";
}
function draw(){
  var doc=frame.contentDocument; if(!doc||!doc.body)return;
  var d=collect(), st=style(seed); cur=st;
  var lay=st.lay;
  function put(){doc.body.innerHTML=render(d,st);doc.documentElement.className="l-"+st.lay;}
  put();
  /* colonne colorée sur toute la hauteur : impossible proprement sur plusieurs pages, on bascule vers une mise en page fluide */
  var cvEl=doc.querySelector(".cv"),hh=0;if(cvEl){cvEl.style.minHeight="0";hh=cvEl.offsetHeight;cvEl.style.minHeight="";}
  if((lay==="sl"||lay==="sr"||lay==="bd")&&hh>1025){st=Object.assign({},st,{lay:["ce","tl","cd"][seed%3]});cur=st;put();}
  doc.documentElement.className="l-"+st.lay;
  var pg=doc.getElementById("pgm");if(!pg){pg=doc.createElement("style");pg.id="pgm";doc.head.appendChild(pg);}
  pg.textContent="@page{size:A4;margin:"+((st.lay==="sl"||st.lay==="sr"||st.lay==="bd")?"0":"12mm 0")+"}";
  doc.documentElement.style.cssText="--p:"+st.P+";--p2:"+st.P2+";--a:"+st.A+";--h:"+st.HL+";--soft:"+st.soft+";--sw:"+st.sw;
  var lab=$("#cv-style-lab"); if(lab)lab.textContent="Style n° "+seed+" : "+({sl:"colonne gauche",sr:"colonne droite",bd:"bandeau",ce:"centré",tl:"chronologie",cd:"cartouche"})[st.lay]+", "+st.hfn+" / "+st.bfn;
  fit(); save();
}
function newSeed(back){
  if(back){if(hist.length){seed=hist.pop();}}
  else{hist.push(seed);seed=Math.floor(Math.random()*900000)+100000;}
  if(live)live.textContent="Nouveau style appliqué";
  draw();
}
function repItem(kind){
  var n=kind==="exp"?++expN:++eduN, wrap=document.createElement("fieldset"); wrap.className="cv-rep";
  var id=function(k){return kind+k+n;};
  var f=function(k,l,ph,ta){return'<div class="field"><label for="'+id(k)+'">'+l+'</label>'+(ta?'<textarea id="'+id(k)+'" data-k="'+k+'" rows="4" placeholder="'+ph+'"></textarea>':'<input id="'+id(k)+'" data-k="'+k+'" type="text" placeholder="'+ph+'" autocomplete="off">')+'</div>';};
  if(kind==="exp"){
    wrap.innerHTML='<legend>Expérience</legend>'+f("poste","Poste occupé","Chargé de communication")+'<div class="cv-row two">'+f("org","Employeur","Agence Lumière")+f("lieu","Lieu","Lyon")+f("deb","Début","09/2019")+f("fin","Fin","Aujourd'hui")+'</div>'+f("miss","Missions et réalisations (une par ligne)","Pilotage de 3 campagnes par trimestre\nHausse de 25 % du trafic du site",1)+'<button type="button" class="cv-btn danger" data-del>Supprimer cette expérience</button>';
  }else{
    wrap.innerHTML='<legend>Formation</legend>'+f("dipl","Diplôme ou formation","Master Communication")+'<div class="cv-row two">'+f("ecole","Établissement","Université de Lyon")+f("per","Année ou période","2016 – 2019")+'</div>'+f("det","Précisions (facultatif)","Mention, spécialité…")+'<button type="button" class="cv-btn danger" data-del>Supprimer cette formation</button>';
  }
  return wrap;
}
function relabel(){["exp","edu"].forEach(function(k){$$("#"+k+"-list .cv-rep").forEach(function(f,i){var lg=f.querySelector("legend");lg.textContent=(k==="exp"?"Expérience n° ":"Formation n° ")+(i+1);});});}
function addRep(kind,data){
  var f=repItem(kind);$("#"+kind+"-list").appendChild(f);
  if(data)Object.keys(data).forEach(function(k){var e=f.querySelector('[data-k="'+k+'"]');if(e)e.value=data[k];});
  relabel();return f;
}
document.addEventListener("click",function(e){
  var b=e.target.closest&&e.target.closest("[data-del]"); if(!b)return;
  var f=b.closest(".cv-rep"),list=f.parentNode,prev=f.previousElementSibling||list.nextElementSibling; f.remove();relabel();draw();
  var t=$("#add-"+(list.id==="exp-list"?"exp":"edu")); if(t)t.focus();
});
/* ---------- mémoire locale (facultative) ---------- */
function save(){
  if(!memOn)return; try{localStorage.setItem(KEY,JSON.stringify({d:collect(),seed:seed}));}catch(e){}
}
function load(){try{return JSON.parse(localStorage.getItem(KEY)||"null");}catch(e){return null;}}
function fill(d){
  FIELDS.forEach(function(k){var e=document.getElementById("f-"+k);if(e)e.value=d[k]||"";});
  $("#exp-list").innerHTML="";$("#edu-list").innerHTML="";
  (d.exp&&d.exp.length?d.exp:[{}]).forEach(function(x){addRep("exp",x);});
  (d.edu&&d.edu.length?d.edu:[{}]).forEach(function(x){addRep("edu",x);});
}
var EX={prenom:"Camille",nom:"Durand",titre:"Chargée de communication digitale",email:"camille.durand@exemple.fr",tel:"06 00 00 00 00",ville:"Lyon (69)",web:"linkedin.com/in/exemple",
 profil:"Chargée de communication avec cinq ans d'expérience en agence et en entreprise. Créative, organisée, orientée résultats : je transforme une stratégie de marque en campagnes qui performent.",
 comp:"Stratégie éditoriale\nRéseaux sociaux\nGestion de projet\nSEO et analytics\nSuite Adobe\nRédaction web",langues:"Anglais : courant (C1)\nEspagnol : intermédiaire (B1)",interets:"Photographie, Randonnée, Bénévolat associatif",permis:"Permis B",
 exp:[{poste:"Chargée de communication",org:"Agence Lumière (exemple)",lieu:"Lyon",deb:"09/2021",fin:"Aujourd'hui",miss:"Pilotage de 3 campagnes par trimestre pour 12 clients\nHausse de 25 % du trafic organique grâce à une refonte éditoriale\nAnimation d'une équipe de 4 freelances"},
  {poste:"Assistante communication",org:"Groupe Horizon (exemple)",lieu:"Grenoble",deb:"10/2019",fin:"08/2021",miss:"Création des newsletters mensuelles (28 000 abonnés)\nGestion des réseaux sociaux et du calendrier éditorial"}],
 edu:[{dipl:"Master Communication et médias",ecole:"Université (exemple)",per:"2017 – 2019",det:"Mention bien, mémoire sur les stratégies de contenu"},{dipl:"Licence Information-communication",ecole:"Université (exemple)",per:"2014 – 2017",det:""}]};
/* ---------- exports ---------- */
function plainText(d){
  var o=[],nm=(d.prenom+" "+d.nom).trim();if(nm)o.push(nm.toUpperCase());if(d.titre)o.push(d.titre);
  var c=[d.email,d.tel,d.ville,d.web].filter(Boolean).join(" | ");if(c)o.push(c);o.push("");
  var sec=function(t,l){if(l.length){o.push(t.toUpperCase());l.forEach(function(x){o.push(x);});o.push("");}};
  if(d.profil.trim())sec(SEC.profil,[d.profil.trim()]);
  var ex=[];d.exp.forEach(function(x){if(!(x.poste||x.org))return;ex.push([x.poste,[x.org,x.lieu].filter(Boolean).join(", "),[x.deb,x.fin].filter(Boolean).join(" – ")].filter(Boolean).join(" | "));lines(x.miss).forEach(function(m){ex.push("- "+m);});ex.push("");});
  if(ex.length){ex.pop();sec(SEC.exp,ex);}
  var ed=[];d.edu.forEach(function(x){if(!(x.dipl||x.ecole))return;ed.push([x.dipl,x.ecole,x.per].filter(Boolean).join(" | "));if(x.det)ed.push(x.det);});sec(SEC.edu,ed);
  sec(SEC.comp,list(d.comp));sec(SEC.lang,lines(d.langues));
  var it=list(d.interets);if(d.permis.trim())it.unshift(d.permis.trim());sec(SEC.int,it);
  return o.join("\n").replace(/\n+$/,"")+"\n";
}
function saveBlob(blob,name){var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},2000);}
var CT=(function(){var t=[],c,n,k;for(n=0;n<256;n++){c=n;for(k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc(u){var c=0xFFFFFFFF;for(var i=0;i<u.length;i++)c=CT[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
function zip(files){
  var enc=new TextEncoder(),parts=[],cd=[],off=0;
  function u16(v){return[v&255,(v>>8)&255];}function u32(v){return[v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255];}
  files.forEach(function(f){var nm=enc.encode(f[0]),d=enc.encode(f[1]),c=crc(d);
    var h=[].concat(u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0x21),u32(c),u32(d.length),u32(d.length),u16(nm.length),u16(0));
    parts.push(new Uint8Array(h),nm,d);
    cd.push(new Uint8Array([].concat(u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0x21),u32(c),u32(d.length),u32(d.length),u16(nm.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(off))),nm);
    off+=h.length+nm.length+d.length;});
  var cs=0;cd.forEach(function(x){cs+=x.length;});parts=parts.concat(cd);
  parts.push(new Uint8Array([].concat(u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(cs),u32(off),u16(0))));
  return new Blob(parts,{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}
function mkDocx(d){
  var x=function(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");};
  var para=function(t,o){o=o||{};return'<w:p><w:pPr><w:spacing w:before="'+(o.b||0)+'" w:after="'+(o.a||60)+'"/>'+(o.bu?'<w:ind w:left="360" w:hanging="220"/>':"")+'</w:pPr><w:r><w:rPr>'+(o.bold?'<w:b/>':"")+(o.sz?'<w:sz w:val="'+o.sz+'"/>':"")+'</w:rPr><w:t xml:space="preserve">'+x((o.bu?"• ":"")+t)+'</w:t></w:r></w:p>';};
  var B="",nm=(d.prenom+" "+d.nom).trim();
  if(nm)B+=para(nm,{bold:1,sz:36});if(d.titre)B+=para(d.titre,{sz:26});
  var c=[d.email,d.tel,d.ville,d.web].filter(Boolean).join("  |  ");if(c)B+=para(c,{a:160});
  var H=function(t){return para(t.toUpperCase(),{bold:1,b:200,a:80,sz:24});};
  if(d.profil.trim()){B+=H(SEC.profil)+para(d.profil.trim());}
  var ex=d.exp.filter(function(e){return e.poste||e.org;});
  if(ex.length){B+=H(SEC.exp);ex.forEach(function(e){B+=para([e.poste,[e.org,e.lieu].filter(Boolean).join(", "),[e.deb,e.fin].filter(Boolean).join(" – ")].filter(Boolean).join(" | "),{bold:1,b:100,a:30});lines(e.miss).forEach(function(m){B+=para(m,{bu:1,a:20});});});}
  var ed=d.edu.filter(function(e){return e.dipl||e.ecole;});
  if(ed.length){B+=H(SEC.edu);ed.forEach(function(e){B+=para([e.dipl,e.ecole,e.per].filter(Boolean).join(" | "),{bold:1,b:60,a:20});if(e.det)B+=para(e.det);});}
  var cp=list(d.comp);if(cp.length)B+=H(SEC.comp)+para(cp.join(", "));
  var lg=lines(d.langues);if(lg.length)B+=H(SEC.lang)+para(lg.join(", "));
  var it=list(d.interets);if(d.permis.trim())it.unshift(d.permis.trim());if(it.length)B+=H(SEC.int)+para(it.join(", "));
  var NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',HD='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  var doc=HD+'<w:document '+NS+'><w:body>'+B+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1100" w:bottom="1000" w:left="1100" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
  var sty=HD+'<w:styles '+NS+'><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>';
  var ct=HD+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>';
  var rels=HD+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  var dr=HD+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  return zip([["[Content_Types].xml",ct],["_rels/.rels",rels],["word/document.xml",doc],["word/styles.xml",sty],["word/_rels/document.xml.rels",dr]]);
}
function status(t){if(live){live.textContent="";setTimeout(function(){live.textContent=t;},40);}}
function fname(d){return"cv-"+((d.prenom+"-"+d.nom).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"modele");}
function init(){
  var m=load(), mem=$("#cv-mem");
  seed=Math.floor(Math.random()*900000)+100000;
  if(m&&m.d){memOn=true;seed=m.seed||seed;fill(m.d);}else{fill({});}
  if(mem){mem.checked=memOn;mem.addEventListener("change",function(){memOn=mem.checked;if(memOn)save();else{try{localStorage.removeItem(KEY);}catch(e){}}$("#cv-memclear").hidden=!memOn;});$("#cv-memclear").hidden=!memOn;
    $("#cv-memclear").addEventListener("click",function(){try{localStorage.removeItem(KEY);}catch(e){}memOn=false;mem.checked=false;this.hidden=true;fill({});draw();status("Données mémorisées effacées");});}
  document.addEventListener("input",function(e){if(e.target.closest&&e.target.closest("#cv-form"))draw();});
  $("#add-exp").addEventListener("click",function(){var f=addRep("exp");f.querySelector("input").focus();draw();});
  $("#add-edu").addEventListener("click",function(){var f=addRep("edu");f.querySelector("input").focus();draw();});
  $("#cv-example").addEventListener("click",function(){fill(EX);draw();status("Exemple chargé : remplacez-le par vos informations");});
  $("#cv-clear").addEventListener("click",function(){fill({});draw();status("Formulaire vidé");});
  $("#cv-new").addEventListener("click",function(){newSeed(false);});
  $("#cv-back").addEventListener("click",function(){newSeed(true);});
  $("#cv-pdf").addEventListener("click",function(){
    var d=collect(),w=frame.contentWindow;frame.contentDocument.title=fname(d);w.focus();w.print();
  });
  $("#cv-docx").addEventListener("click",function(){var d=collect();saveBlob(mkDocx(d),fname(d)+".docx");});
  $("#cv-copy").addEventListener("click",function(){var t=plainText(collect()),b=this;
    var ok=function(r){status(r?"Texte du CV copié":"Copie impossible");};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(function(){ok(true);},function(){ok(false);});
    else{var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();var r=false;try{r=document.execCommand("copy");}catch(e){}ta.remove();ok(r);}});
  var sh=$("#cv-share");try{var tf=new File([""],"t.docx",{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});if(sh&&navigator.canShare&&navigator.canShare({files:[tf]}))sh.hidden=false;}catch(e){}
  if(sh)sh.addEventListener("click",function(){var d=collect();navigator.share({files:[new File([mkDocx(d)],fname(d)+".docx",{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"})],title:"CV"}).catch(function(){});});
  window.addEventListener("resize",fit);
  draw();
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
}
if(frame.contentDocument&&frame.contentDocument.readyState==="complete"&&frame.contentDocument.body&&frame.contentDocument.body.className==="cvdoc")init();
else frame.addEventListener("load",function(){if(!frame.__i){frame.__i=1;init();}});
})();
