/* Mon plan de sortie du surendettement : tout se passe dans le navigateur, rien n'est envoyé. */
(function(){"use strict";
var KEY="sd-plan-sortie-v1";
function $(s,r){return(r||document).querySelector(s);}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
function E(t){return String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function eur(v){return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(v);}
function p2(n){return(n<10?"0":"")+n;}
/* ---------- calendrier (.ics) ---------- */
function ymd(d){return d.getFullYear()+p2(d.getMonth()+1)+p2(d.getDate());}
function addMonths(d,n){var x=new Date(d.getFullYear(),d.getMonth()+n,d.getDate());if(x.getDate()!==d.getDate())x=new Date(d.getFullYear(),d.getMonth()+n+1,0);return x;}
function esc(t){return String(t).replace(/\\/g,"\\\\").replace(/;/g,"\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");}
function ics(o){
  var now=new Date(),st=now.getUTCFullYear()+p2(now.getUTCMonth()+1)+p2(now.getUTCDate())+"T"+p2(now.getUTCHours())+p2(now.getUTCMinutes())+p2(now.getUTCSeconds())+"Z";
  var L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SimuDroit//FR","CALSCALE:GREGORIAN"],n=0;
  function ev(date,title,desc,rrule){
    var nx=new Date(date.getFullYear(),date.getMonth(),date.getDate()+1);
    L.push("BEGIN:VEVENT","UID:plan-"+ymd(date)+"-"+(n++)+"-"+Math.random().toString(36).slice(2,8)+"@simudroit.fr","DTSTAMP:"+st,"DTSTART;VALUE=DATE:"+ymd(date),"DTEND;VALUE=DATE:"+ymd(nx),"SUMMARY:"+esc(title),"DESCRIPTION:"+esc(desc));
    if(rrule)L.push("RRULE:"+rrule);
    L.push("BEGIN:VALARM","TRIGGER:-P1D","ACTION:DISPLAY","DESCRIPTION:"+esc(title),"END:VALARM","END:VEVENT");
  }
  if(o.depot){
    ev(o.depot,"Déposer mon dossier de surendettement","Déposer le dossier auprès de la succursale de la Banque de France de votre département. La procédure est gratuite.");
    ev(addMonths(o.depot,3),"Réponse sur la recevabilité attendue (3 mois maximum)","La commission a 3 mois maximum pour se prononcer sur la recevabilité. Si vous n'avez pas de nouvelles, contactez la Banque de France.");
  }
  if(o.loyer>=1&&o.loyer<=28){
    var d=new Date(o.debut.getFullYear(),o.debut.getMonth(),o.loyer);if(d<o.debut)d=new Date(d.getFullYear(),d.getMonth()+1,o.loyer);
    ev(d,"Payer le loyer et les charges courantes","Pendant la procédure, il faut continuer à payer le loyer et les charges courantes.","FREQ=MONTHLY;COUNT=12");
  }
  if(o.budget){
    var b=new Date(o.debut.getFullYear(),o.debut.getMonth()+1,1);
    ev(b,"Mon point budget du mois (10 minutes)","Comparer mes dépenses aux enveloppes du mois, cocher une petite victoire.","FREQ=MONTHLY;COUNT=12");
  }
  L.push("END:VCALENDAR");
  return L.join("\r\n")+"\r\n";
}
/* ---------- analyse d'un relevé CSV ---------- */
function norm(t){return String(t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");}
function splitLine(l,sep){var o=[],c="",q=false;for(var i=0;i<l.length;i++){var ch=l[i];if(ch==='"'){if(q&&l[i+1]==='"'){c+='"';i++;}else q=!q;}else if(ch===sep&&!q){o.push(c);c="";}else c+=ch;}o.push(c);return o.map(function(x){return x.trim();});}
function num(s){
  s=String(s==null?"":s).replace(/[€\s ]/g,"");if(!s)return NaN;
  if(/,\d{1,2}$/.test(s))s=s.replace(/\./g,"").replace(",",".");else s=s.replace(/,/g,"");
  var v=parseFloat(s);return isFinite(v)?v:NaN;
}
var CATS=[
 ["Crédits et remboursements",/\b(pret|credit|cetelem|cofidis|sofinco|franfinance|oney|younited|floa|cetelem|remboursement)\b/],
 ["Jeux d'argent",/\b(fdj|francaise des jeux|parions|winamax|betclic|pmu|unibet|zebet|casino en ligne)\b/],
 ["Logement et énergie",/\b(loyer|edf|engie|totalenergies|veolia|gaz|electricite|syndic|foncier|eau)\b/],
 ["Alimentation",/\b(carrefour|leclerc|auchan|lidl|intermarche|monoprix|casino|aldi|franprix|picard|boulangerie|restaurant|uber eats|deliveroo|mcdo|mcdonald|burger|boucherie|primeur)\b/],
 ["Transport",/\b(sncf|ratp|navigo|essence|carburant|station|peage|vinci|autoroute|parking|blablacar|bolt|uber)\b/],
 ["Abonnements et téléphone",/\b(netflix|spotify|disney|prime video|amazon prime|canal|deezer|youtube|apple|google play|free mobile|free|orange|sfr|bouygues|sosh|abonnement|basic fit|fitness|salle de sport)\b/],
 ["Assurances et santé",/\b(mutuelle|assurance|maif|macif|axa|groupama|matmut|pharmacie|docteur|dentiste|medecin)\b/],
 ["Impôts et taxes",/\b(dgfip|impot|impots|tresor public|taxe)\b/],
 ["Frais bancaires",/\b(frais|commission|agios|cotisation carte|cotis carte|decouvert)\b/]
];
function cat(label){var n=norm(label);for(var i=0;i<CATS.length;i++)if(CATS[i][1].test(n))return CATS[i][0];return "Autres dépenses";}
function parseCsv(text){
  var lines=String(text||"").replace(/^\ufeff/,"").split(/\r?\n/).filter(function(l){return l.trim();});
  if(lines.length<2)return{rows:[],err:"Le fichier semble vide."};
  var sep=[";",",","\t"].map(function(s){return[s,(lines[0].split(s).length)];}).sort(function(a,b){return b[1]-a[1];})[0][0];
  var head=splitLine(lines[0],sep).map(norm),ix={date:-1,lib:-1,deb:-1,cre:-1,mon:-1};
  head.forEach(function(h,i){
    if(ix.date<0&&/date/.test(h))ix.date=i;
    else if(ix.lib<0&&/(libelle|label|description|intitule|operation|detail)/.test(h))ix.lib=i;
    else if(ix.deb<0&&/debit/.test(h))ix.deb=i;
    else if(ix.cre<0&&/credit/.test(h))ix.cre=i;
    else if(ix.mon<0&&/(montant|amount|valeur)/.test(h))ix.mon=i;
  });
  if(ix.lib<0||(ix.mon<0&&ix.deb<0))return{rows:[],err:"Colonnes non reconnues. Il faut au minimum un libellé et un montant (ou débit/crédit)."};
  var rows=[];
  for(var k=1;k<lines.length;k++){
    var c=splitLine(lines[k],sep),amt;
    if(ix.mon>=0){amt=num(c[ix.mon]);}
    else{var d=num(c[ix.deb]),cr=ix.cre>=0?num(c[ix.cre]):NaN;amt=isFinite(d)&&d!==0?-Math.abs(d):(isFinite(cr)?Math.abs(cr):NaN);}
    if(!isFinite(amt))continue;
    rows.push({date:ix.date>=0?c[ix.date]:"",label:c[ix.lib]||"",amt:amt});
  }
  return{rows:rows,err:rows.length?"":"Aucune ligne exploitable."};
}
function monthOf(d){var m=String(d).match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);if(m)return(m[3].length===2?"20"+m[3]:m[3])+"-"+p2(+m[2]);m=String(d).match(/(\d{4})-(\d{2})-\d{2}/);return m?m[1]+"-"+m[2]:"";}
function analyse(text){
  var p=parseCsv(text);if(p.err)return{err:p.err};
  var dep=0,rev=0,by={},rec={};
  p.rows.forEach(function(r){
    if(r.amt<0){
      var a=-r.amt,c=cat(r.label);dep+=a;by[c]=(by[c]||0)+a;
      var key=norm(r.label).replace(/[0-9]+/g,"").replace(/\s+/g," ").trim().slice(0,28);
      if(key){var o=rec[key]||(rec[key]={label:r.label,months:{},sum:0,n:0,cat:c});o.months[monthOf(r.date)||("l"+o.n)]=1;o.sum+=a;o.n++;}
    }else rev+=r.amt;
  });
  var cats=Object.keys(by).map(function(k){return{cat:k,total:by[k]};}).sort(function(a,b){return b.total-a.total;});
  var recur=Object.keys(rec).map(function(k){var o=rec[k];return{label:o.label,mois:Object.keys(o.months).length,mensuel:o.sum/Math.max(1,Object.keys(o.months).length),cat:o.cat};})
    .filter(function(o){return o.mois>=2&&(o.cat==="Abonnements et téléphone"||o.cat==="Crédits et remboursements"||o.cat==="Jeux d'argent"||o.cat==="Frais bancaires"||o.cat==="Autres dépenses");})
    .sort(function(a,b){return b.mensuel-a.mensuel;}).slice(0,8);
  return{depenses:dep,revenus:rev,cats:cats,recurrents:recur,n:p.rows.length,solde:rev-dep};
}
var EXEMPLE="Date;Libellé;Montant\n01/09/2026;VIREMENT SALAIRE;1650,00\n02/09/2026;LOYER SEPTEMBRE;-620,00\n03/09/2026;CARREFOUR MARKET;-74,30\n05/09/2026;NETFLIX.COM;-13,49\n06/09/2026;FREE MOBILE;-19,99\n08/09/2026;CETELEM REMBOURSEMENT;-95,00\n10/09/2026;EDF PRELEVEMENT;-68,00\n12/09/2026;TOTAL STATION;-52,10\n14/09/2026;SALLE DE SPORT BASIC FIT;-29,90\n18/09/2026;LECLERC;-91,20\n20/09/2026;FRAIS DECOUVERT AUTORISE;-14,00\n01/10/2026;VIREMENT SALAIRE;1650,00\n02/10/2026;LOYER OCTOBRE;-620,00\n04/10/2026;NETFLIX.COM;-13,49\n05/10/2026;FREE MOBILE;-19,99\n08/10/2026;CETELEM REMBOURSEMENT;-95,00\n09/10/2026;LIDL;-66,40\n11/10/2026;SALLE DE SPORT BASIC FIT;-29,90\n15/10/2026;EDF PRELEVEMENT;-68,00\n19/10/2026;PARIONS SPORT FDJ;-40,00\n";
/* ---------- affichage ---------- */
function drawAnalyse(a){
  var out=$("#ps-out"),sum=$("#ps-sum");if(!out)return;
  if(a.err){out.innerHTML="";sum.textContent=a.err;return;}
  var mx=a.cats.length?a.cats[0].total:1;
  sum.textContent=a.n+" opérations lues. Dépenses : "+eur(a.depenses)+". Revenus : "+eur(a.revenus)+".";
  var h='<h3>Où part l\'argent</h3><ul class="ps-bars">'+a.cats.map(function(c){return'<li><span class="ps-bl">'+E(c.cat)+'</span><span class="ps-bar"><i style="width:'+Math.max(3,Math.round(c.total/mx*100))+'%"></i></span><strong>'+eur(c.total)+'</strong></li>';}).join("")+'</ul>';
  if(a.recurrents.length){var tot=a.recurrents.reduce(function(s,x){return s+x.mensuel;},0);
    h+='<h3>À passer en revue en premier</h3><p>Ces dépenses reviennent plusieurs mois de suite. Les revoir peut libérer environ <strong>'+eur(tot)+'</strong> par mois. À vous de décider ce qui compte vraiment.</p><ul class="ps-rec">'+a.recurrents.map(function(x){return'<li>'+E(x.label)+' <strong>'+eur(x.mensuel)+'</strong> par mois <small>('+E(x.cat)+')</small></li>';}).join("")+'</ul>';}
  h+='<p class="ps-note">Le tri est automatique et peut se tromper : vérifiez les postes importants. Rien de ce fichier n\'a quitté votre appareil.</p>';
  out.innerHTML=h;
}
function save(){var st={};$$("[data-st]").forEach(function(c){st[c.dataset.st]=c.checked;});try{localStorage.setItem(KEY,JSON.stringify(st));}catch(e){}}
function progress(){var all=$$("[data-st]"),n=all.filter(function(c){return c.checked;}).length,t=all.length,b=$("#ps-prog i"),l=$("#ps-prog-l");
  if(b)b.style.width=(t?Math.round(n/t*100):0)+"%";
  if(l)l.textContent=n===0?"Prêt à commencer : la première étape est la plus importante.":n===t?"Bravo, vous avez fait toutes les étapes. Une nouvelle page se tourne.":n+" étape"+(n>1?"s":"")+" sur "+t+" faite"+(n>1?"s":"")+". Continuez, vous avancez.";}
function init(){
  var mem=$("#ps-mem"),clr=$("#ps-clear"),on=false;
  try{var raw=localStorage.getItem(KEY);if(raw){var st=JSON.parse(raw);on=true;$$("[data-st]").forEach(function(c){c.checked=!!st[c.dataset.st];});}}catch(e){}
  if(mem){mem.checked=on;if(clr)clr.hidden=!on;
    mem.addEventListener("change",function(){if(mem.checked){save();}else{try{localStorage.removeItem(KEY);}catch(e){}}if(clr)clr.hidden=!mem.checked;});}
  if(clr)clr.addEventListener("click",function(){try{localStorage.removeItem(KEY);}catch(e){}$$("[data-st]").forEach(function(c){c.checked=false;});mem.checked=false;clr.hidden=true;progress();});
  $$("[data-st]").forEach(function(c){c.addEventListener("change",function(){if(mem&&mem.checked)save();progress();});});
  progress();
  var dep=$("#ps-depot");if(dep&&!dep.value){var t=new Date();t.setDate(t.getDate()+7);dep.value=t.getFullYear()+"-"+p2(t.getMonth()+1)+"-"+p2(t.getDate());}
  var bi=$("#ps-ics");
  if(bi)bi.addEventListener("click",function(){
    var v=($("#ps-depot")||{}).value,d=null;if(v){var m=v.split("-");d=new Date(+m[0],+m[1]-1,+m[2]);}
    var lo=parseInt(($("#ps-loyer")||{}).value,10),txt=ics({depot:d,loyer:lo,budget:$("#ps-budget")&&$("#ps-budget").checked,debut:new Date()});
    var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:"text/calendar;charset=utf-8"}));a.download="mon-plan-de-sortie.ics";document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
    var s=$("#ps-ics-s");if(s)s.textContent="Fichier créé. Ouvrez-le pour l'ajouter à votre agenda.";
  });
  var f=$("#ps-file");
  if(f)f.addEventListener("change",function(){var fl=f.files&&f.files[0];if(!fl)return;var r=new FileReader();r.onload=function(){drawAnalyse(analyse(String(r.result)));};r.readAsText(fl,"utf-8");});
  var ex=$("#ps-exemple");if(ex)ex.addEventListener("click",function(){drawAnalyse(analyse(EXEMPLE));});
}
window.SDplan={analyse:analyse,ics:ics,parseCsv:parseCsv,addMonths:addMonths,cat:cat};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
