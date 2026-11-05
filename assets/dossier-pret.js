/* Dossier de prêt immobilier : tout se passe dans le navigateur, rien n'est envoyé. */
(function(){"use strict";
var $=function(s,r){return(r||document).querySelector(s);},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
var KEY="sd-dossier-pret-v1";
function E(t){return String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function num(v){v=parseFloat(String(v==null?"":v).replace(/\s/g,"").replace(",","."));return isFinite(v)&&v>0?v:0;}
function r2(n){return Math.round(n*100)/100;}
function eur(n){return(Math.round(n*100)/100).toLocaleString("fr-FR",{minimumFractionDigits:0,maximumFractionDigits:2}).replace(/[  ]/g," ")+" €";}
function pct(n){return(Math.round(n*10)/10).toLocaleString("fr-FR")+" %";}
function crd(P,r,m,k,n){if(P<=0||k>=n)return 0;if(r===0)return Math.max(0,P-m*k);return Math.max(0,P*Math.pow(1+r,k)-m*(Math.pow(1+r,k)-1)/r);}
function pay(P,rate,n){var r=rate/1200;return n>0&&P>0?(r>0?P*r/(1-Math.pow(1+r,-n)):P/n):0;}
function sens(o,P,n,fixes,rev){return[-0.5,0,0.5,1].map(function(dx){var t=Math.max(0,num(o.taux)+dx),m=pay(P,t,n)+P*num(o.tass)/100/12;return{taux:Math.round(t*100)/100,mens:r2(m),endet:rev>0?Math.round((m+fixes)/rev*1000)/10:0};});}
/* Calcul : fonction pure, exposée pour les tests. */
function calc(o){
  var rev=num(o.rev1)+num(o.rev2)+num(o.revautres);
  var cout=num(o.prix)+num(o.travaux)+num(o.notaire)+num(o.frais);
  var apport=num(o.apport)+num(o.don);
  var autres=num(o.ptz);
  var emprunt=Math.max(0,cout-apport-autres);
  var n=Math.round(num(o.duree)*12),r=num(o.taux)/1200,m=0;
  if(n>0&&emprunt>0)m=r>0?emprunt*r/(1-Math.pow(1+r,-n)):emprunt/n;
  var ass=emprunt*num(o.tass)/100/12;
  var mt=m+ass,fixes=num(o.credits)+num(o.pension);
  var charges=num(o.charges);
  var epargne=num(o.livreta)+num(o.ldds)+num(o.lep)+num(o.av)+num(o.pea)+num(o.epautre);
  var resteEp=Math.max(0,epargne-num(o.apport));
  var endet=rev>0?(mt+fixes)/rev*100:0;
  var reste=rev-mt-fixes-charges;
  var sortie=mt+fixes+charges;
  return{rev:r2(rev),cout:r2(cout),apport:r2(apport),autres:r2(autres),emprunt:r2(emprunt),mensualite:r2(m),assurance:r2(ass),mensTotal:r2(mt),
    coutCredit:r2(n>0?m*n+ass*n-emprunt:0),endettement:Math.round(endet*10)/10,reste:r2(reste),
    pApport:cout>0?Math.round(apport/cout*1000)/10:0,epargne:r2(epargne),epargneRestante:r2(resteEp),
    coutOp:r2(cout),crd5:r2(crd(emprunt,r,m,60,n)),crd10:r2(crd(emprunt,r,m,120,n)),crd15:r2(crd(emprunt,r,m,180,n)),int5:r2(n>=60?m*60-(emprunt-crd(emprunt,r,m,60,n)):0),
    sens:sens(o,emprunt,n,fixes,rev),
    moisReserve:sortie>0?Math.round(resteEp/sortie*10)/10:0,sous35:rev>0&&endet<=35,mensMax35:r2(Math.max(0,rev*0.35-fixes))};
}
window.sdDP=calc;
var COL=["#1f5f4a","#2b5fa8","#d9a400","#c8321e","#7b8190","#6b4aa0"];
function segs(list){var tot=0;list.forEach(function(x){tot+=x[1];});if(tot<=0)return"<p class=\"dp-n\">Renseignez les montants pour voir le graphique.</p>";
  var bar="<div class=\"dp-bar\" role=\"img\" aria-label=\"Répartition\">"+list.map(function(x,i){return x[1]>0?"<span style=\"width:"+(x[1]/tot*100).toFixed(2)+"%;background:"+COL[i%6]+"\"></span>":"";}).join("")+"</div>";
  var leg="<ul class=\"dp-leg\">"+list.map(function(x,i){return x[1]>0?"<li><i style=\"background:"+COL[i%6]+"\"></i>"+E(x[0])+" <b>"+eur(x[1])+"</b> <small>"+Math.round(x[1]/tot*100)+" %</small></li>":"";}).join("")+"</ul>";
  return bar+leg;}
function gauge(v,lab){var w=Math.min(100,v/50*100);return"<div class=\"dp-gauge\"><div class=\"dp-gl\"><span>"+E(lab)+"</span><b>"+pct(v)+"</b></div><div class=\"dp-gt\"><span class=\"dp-gf "+(v<=35?"ok":"warn")+"\" style=\"width:"+w+"%\"></span><i class=\"dp-g35\"></i></div><div class=\"dp-gs\"><span>0 %</span><span class=\"dp-g35l\">35 %</span><span>50 %</span></div></div>";}
function check(ok,t,d){return"<li class=\""+(ok===true?"ok":ok===false?"ko":"na")+"\"><b>"+E(t)+"</b><span>"+E(d)+"</span></li>";}
var PIECES=[["Identité et situation",["Pièce d'identité en cours de validité de chaque emprunteur","Justificatif de domicile récent","Livret de famille, contrat de mariage ou convention de PACS le cas échéant"]],
["Revenus",["Trois derniers bulletins de paie et dernier bulletin de décembre","Deux derniers avis d'imposition","Contrat de travail ou attestation de l'employeur","Indépendants : derniers bilans et liasses fiscales"]],
["Comptes, épargne et crédits",["Relevés des comptes bancaires des trois derniers mois","Justificatifs de l'épargne (livrets, assurance-vie, PEA)","Tableaux d'amortissement des crédits en cours"]],
["Le bien",["Compromis ou promesse de vente signé, ou annonce et estimation","Diagnostic de performance énergétique (DPE) et diagnostics du bien","Devis des travaux le cas échéant","Ancien en copropriété : derniers procès-verbaux d'assemblée générale et montant des charges"]]];
function row(a,b){return"<tr><th scope=\"row\">"+E(a)+"</th><td>"+E(b)+"</td></tr>";}
function line(a,b){return b?row(a,b):"";}
function sheet(d){
  var c=calc(d),h="",nm=function(i){return d["nom"+i]||"";};
  var noms=[nm(1),nm(2)].filter(Boolean).join(" et ");
  var duree=num(d.duree),tx=num(d.taux);
  h+="<div class=\"dp-top\"><div><p class=\"dp-kick\">Dossier de demande de prêt immobilier"+(d.destin?" - "+E(d.destin):"")+"</p><h2 class=\"dp-h\">"+E(d.adresse?"Projet d'achat : "+d.adresse:"Projet d'achat")+"</h2>"+(noms?"<p class=\"dp-who\">Emprunteur"+(nm(2)?"s":"")+" : "+E(noms)+"</p>":"")+"</div><div class=\"dp-meta\"><span>Établi le "+E(new Date().toLocaleDateString("fr-FR"))+"</span></div></div>";
  h+="<div class=\"dp-kpi\"><div><span>Montant demandé</span><b>"+eur(c.emprunt)+"</b><small>sur "+(duree||"…")+" ans à "+pct(tx)+"</small></div><div><span>Mensualité assurance comprise</span><b>"+eur(c.mensTotal)+"</b><small>dont assurance "+eur(c.assurance)+"</small></div><div><span>Apport</span><b>"+pct(c.pApport)+"</b><small>"+eur(c.apport)+" sur "+eur(c.cout)+"</small></div><div class=\""+(c.sous35?"ok":(c.rev>0?"warn":""))+"\"><span>Taux d'endettement</span><b>"+pct(c.endettement)+"</b><small>seuil usuel : 35 %</small></div><div><span>Reste à vivre</span><b>"+eur(c.reste)+"</b><small>par mois après le prêt</small></div></div>";
  h+="<h3>1. Plan de financement</h3><div class=\"dp-two\"><div><p class=\"dp-g\">Emplois : ce que coûte l'opération ("+eur(c.cout)+")</p>"+segs([["Prix du bien",num(d.prix)],["Travaux",num(d.travaux)],["Frais de notaire",num(d.notaire)],["Autres frais",num(d.frais)]])+"</div><div><p class=\"dp-g\">Ressources : comment il est financé ("+eur(c.cout)+")</p>"+segs([["Prêt demandé",c.emprunt],["Apport personnel",num(d.apport)],["Don familial",num(d.don)],["Autres prêts",c.autres]])+"</div></div>";
  h+="<h3>2. Le bien</h3><table class=\"dp-t\"><tbody>"+line("Destination du bien",d.destin)+line("Nature",[d.btype,d.etat].filter(Boolean).join(", "))+line("Localisation",d.adresse)+line("Surface habitable",num(d.surface)?num(d.surface)+" m²":"")+line("Prix au m² habitable",num(d.surface)&&num(d.prix)?eur(num(d.prix)/num(d.surface)):"")+line("Terrain",num(d.terrain)?num(d.terrain)+" m²":"")+line("Nombre de pièces",num(d.pieces)?String(num(d.pieces)):"")+line("Année de construction",d.annee)+line("Diagnostic de performance énergétique",d.dpe)+line("Points à signaler",d.remarques)+row("Prix d'achat",eur(num(d.prix)))+line("Travaux",num(d.travaux)?eur(num(d.travaux)):"")+line("Frais de notaire",num(d.notaire)?eur(num(d.notaire)):"")+line("Autres frais (agence, courtier, garantie)",num(d.frais)?eur(num(d.frais)):"")+"</tbody></table>";
  if(d.destin==="Investissement locatif"){var lo=num(d.loyerprevu)*12,ch=num(d.chargesloc),k=c.cout;h+="<h3>Projet locatif</h3><table class=\"dp-t\"><tbody>"+row("Loyer mensuel attendu (hors charges)",eur(num(d.loyerprevu)))+row("Loyers annuels attendus",eur(lo))+row("Charges annuelles du propriétaire",eur(ch))+row("Rendement brut (loyers annuels ÷ coût de l'opération)",k>0?pct(lo/k*100):"-")+row("Rendement net de charges (avant impôt et vacance locative)",k>0?pct((lo-ch)/k*100):"-")+row("Loyer mensuel attendu / mensualité du prêt",c.mensTotal>0?pct(num(d.loyerprevu)/c.mensTotal*100):"-")+"</tbody></table><p class=\"dp-n\">Les loyers attendus ne sont pas comptés dans les revenus du calcul d'endettement ci-dessus : la banque décide de la part qu'elle retient. Joignez le bail ou une estimation du loyer, et vos charges réelles.</p>";}
  h+="<h3>3. Emprunteurs</h3><table class=\"dp-t\"><tbody>"+line("Situation familiale",d.famille);
  [1,2].forEach(function(i){if(nm(i)||d["prof"+i])h+=row("Emprunteur "+i+(nm(i)?" : "+nm(i):""),[d["prof"+i],d["contrat"+i],d["anc"+i]?"ancienneté "+d["anc"+i]:""].filter(Boolean).join(", "));});
  h+="</tbody></table>";
  h+="<h3>4. Revenus mensuels</h3><table class=\"dp-t\"><tbody>"+(num(d.rev1)?row("Revenu net de l'emprunteur 1",eur(num(d.rev1))):"")+(num(d.rev2)?row("Revenu net de l'emprunteur 2",eur(num(d.rev2))):"")+(num(d.revautres)?row("Autres revenus réguliers",eur(num(d.revautres))):"")+"<tr class=\"dp-tot\"><th scope=\"row\">Total des revenus nets</th><td>"+eur(c.rev)+"</td></tr></tbody></table>";
  h+="<p class=\"dp-g\">À quoi servent les revenus chaque mois</p>"+segs([["Nouveau prêt (assurance comprise)",c.mensTotal],["Crédits en cours",num(d.credits)],["Pensions versées",num(d.pension)],["Charges courantes",num(d.charges)],["Reste à vivre",Math.max(0,c.reste)]]);
  h+="<h3>5. Endettement</h3>"+gauge(c.endettement,"Taux d'endettement après le projet")+(num(d.loyer)&&c.rev>0?gauge(Math.round((num(d.loyer)+fixesOf(d))/c.rev*1000)/10,"Taux actuel, loyer actuel compris"):"")+"<p class=\"dp-n\">Calcul : (mensualité du prêt avec assurance"+(num(d.credits)||num(d.pension)?" + crédits en cours + pensions versées":"")+") ÷ revenus nets. Mensualité maximale pour rester à 35 % : <b>"+eur(c.mensMax35)+"</b> par mois, assurance comprise.</p>";
  h+="<h3>6. Reste à vivre</h3><div class=\"dp-key "+(c.reste>0?"":"warn")+"\"><strong>"+eur(c.reste)+"</strong><span>par mois après le prêt, les crédits en cours et les charges courantes</span></div>";
  h+="<h3>7. Épargne et apport</h3>"+segs([["Livret A",num(d.livreta)],["LDDS",num(d.ldds)],["LEP",num(d.lep)],["Assurance-vie",num(d.av)],["PEA",num(d.pea)],["Autre"+(d.epnom?" ("+d.epnom+")":""),num(d.epautre)]])+"<table class=\"dp-t\"><tbody><tr class=\"dp-tot\"><th scope=\"row\">Épargne totale</th><td>"+eur(c.epargne)+"</td></tr>"+row("Apport personnel mobilisé",eur(num(d.apport)))+(num(d.don)?row("Don familial",eur(num(d.don))):"")+row("Épargne conservée après l'achat",eur(c.epargneRestante)+(c.moisReserve?" (environ "+String(c.moisReserve).replace(".",",")+" mois de dépenses)":""))+"</tbody></table>";
  if(c.emprunt>0&&duree>0){h+="<h3>8. Le prêt dans le temps</h3><table class=\"dp-t dp-t3\"><thead><tr><th>Après</th><th>Capital restant dû</th><th>Déjà remboursé</th></tr></thead><tbody>"+[[5,c.crd5],[10,c.crd10],[15,c.crd15]].filter(function(x){return duree>x[0];}).map(function(x){return"<tr><th scope=\"row\">"+x[0]+" ans</th><td>"+eur(x[1])+"</td><td>"+eur(c.emprunt-x[1])+"</td></tr>";}).join("")+"</tbody></table><p class=\"dp-n\">Coût total estimé du crédit (intérêts + assurance) : <b>"+eur(c.coutCredit)+"</b>.</p>";
    h+="<p class=\"dp-g\">Si le taux varie (test de sensibilité)</p><table class=\"dp-t dp-t3\"><thead><tr><th>Taux</th><th>Mensualité avec assurance</th><th>Taux d'endettement</th></tr></thead><tbody>"+c.sens.map(function(x){return"<tr"+(x.taux===tx?" class=\"dp-tot\"":"")+"><th scope=\"row\">"+pct(x.taux)+"</th><td>"+eur(x.mens)+"</td><td>"+pct(x.endet)+"</td></tr>";}).join("")+"</tbody></table>";}
  h+="<h3>9. Repères pour l'étude du dossier</h3><p class=\"dp-n\">Auto-diagnostic indicatif, établi par l'emprunteur. Les seuils sont des repères usuels, chaque banque applique les siens.</p><ul class=\"dp-ck\">"
    +check(c.rev>0?c.sous35:null,"Taux d'endettement d'au plus 35 %",c.rev>0?pct(c.endettement)+" avec assurance":"revenus non renseignés")
    +check(duree?duree<=25:null,"Durée de 25 ans au plus",duree?duree+" ans":"non renseignée")
    +check(c.cout>0?c.pApport>=10:null,"Apport couvrant au moins 10 % de l'opération",pct(c.pApport))
    +check(c.rev>0?c.reste>0:null,"Reste à vivre positif",eur(c.reste))
    +check(c.epargne>0||num(d.apport)>0?c.moisReserve>=3:null,"Épargne conservée d'au moins 3 mois de dépenses",c.moisReserve?String(c.moisReserve).replace(".",",")+" mois":"aucune épargne conservée")
    +check(num(d.credits)>0?null:true,"Aucun crédit en cours",num(d.credits)>0?eur(num(d.credits))+" par mois":"aucun")
    +"</ul>";
  h+="<h3>10. Pièces à joindre (liste usuelle)</h3><p class=\"dp-n\">Chaque banque fixe sa propre liste : demandez-la avant de constituer le dossier. Cochez au fur et à mesure.</p><div class=\"dp-pcs\">";
  PIECES.forEach(function(g){h+="<div><p class=\"dp-g\">"+E(g[0])+"</p><ul class=\"dp-cl\">"+g[1].map(function(x){return"<li>"+E(x)+"</li>";}).join("")+"</ul></div>";});
  h+="</div><p class=\"dp-foot\">Document établi par l'emprunteur à partir de ses propres informations, à titre de simulation. Les montants, taux et mensualités sont des estimations qui ne constituent pas une offre de prêt. Seule la banque décide de l'accord du financement.</p>";
  return h;
}
function fixesOf(d){return num(d.credits)+num(d.pension);}
function plain(d){var c=calc(d);return["DOSSIER DE PRÊT IMMOBILIER"+(d.adresse?" - "+d.adresse:""),"","Coût total : "+eur(c.cout),"Apport : "+eur(c.apport)+" ("+pct(c.pApport)+")","Montant à emprunter : "+eur(c.emprunt),"Mensualité estimée (assurance comprise) : "+eur(c.mensTotal),"Revenus mensuels : "+eur(c.rev),"Taux d'endettement : "+pct(c.endettement),"Reste à vivre : "+eur(c.reste),"Épargne totale : "+eur(c.epargne)+", conservée après achat : "+eur(c.epargneRestante)].join("\n");}
function collect(){var d={};$$("#dp-form [data-f]").forEach(function(e){d[e.dataset.f]=e.value;});return d;}
function draw(){var d=collect();$("#dp-sheet").innerHTML=sheet(d);var c=calc(d),s=$("#dp-sum");if(s)s.innerHTML="<span><b>"+eur(c.emprunt)+"</b> à emprunter</span><span><b>"+eur(c.mensTotal)+"</b> par mois</span><span class=\""+(c.sous35?"ok":(c.rev>0?"warn":""))+"\"><b>"+pct(c.endettement)+"</b> d'endettement</span><span><b>"+eur(c.reste)+"</b> de reste à vivre</span>";}
function save(d){var on=$("#dp-mem");if(on&&on.checked){try{localStorage.setItem(KEY,JSON.stringify(d));}catch(e){}}}
function load(){try{return JSON.parse(localStorage.getItem(KEY)||"null");}catch(e){return null;}}
function fill(d){$$("#dp-form [data-f]").forEach(function(e){if(d[e.dataset.f]!=null)e.value=d[e.dataset.f];});}
function example(){fill({nom1:"Camille Martin",prof1:"Technicienne",contrat1:"CDI",anc1:"6 ans",nom2:"Julien Martin",prof2:"Chauffeur",contrat2:"CDI",anc2:"4 ans",famille:"Mariés, 1 enfant à charge",rev1:"2100",rev2:"1900",revautres:"",loyer:"800",charges:"1100",credits:"0",crdrest:"",pension:"",livreta:"12000",ldds:"4000",lep:"",av:"8000",pea:"",epautre:"",epnom:"",apport:"30000",don:"",btype:"Maison",etat:"Ancien",adresse:"Limoges (87)",surface:"110",terrain:"600",pieces:"5",annee:"1998",dpe:"D",remarques:"Garage, aucun gros travaux à prévoir",prix:"230000",travaux:"10000",notaire:"17000",frais:"0",duree:"25",taux:"3.8",tass:"0.30",ptz:""});draw();}
function say(t){var l=$("#dp-live");if(l){l.textContent="";setTimeout(function(){l.textContent=t;},40);}}
function init(){var f=$("#dp-form");if(!f)return;
  var saved=load();if(saved){fill(saved);var m=$("#dp-mem");if(m){m.checked=true;$("#dp-memclear").hidden=false;}}
  var onc=function(){draw();save(collect());};f.addEventListener("input",onc);f.addEventListener("change",onc);
  $("#dp-example").addEventListener("click",function(){example();say("Exemple chargé");});
  $("#dp-clear").addEventListener("click",function(){f.reset();draw();say("Formulaire vidé");});
  $("#dp-mem").addEventListener("change",function(){if(this.checked){$("#dp-memclear").hidden=false;save(collect());}else{try{localStorage.removeItem(KEY);}catch(e){}$("#dp-memclear").hidden=true;}});
  $("#dp-memclear").addEventListener("click",function(){try{localStorage.removeItem(KEY);}catch(e){}$("#dp-mem").checked=false;this.hidden=true;say("Données effacées");});
  $("#dp-pdf").addEventListener("click",function(){var t=document.title;document.title="dossier-pret-immobilier";draw();window.print();setTimeout(function(){document.title=t;},800);});
  $("#dp-copy").addEventListener("click",function(){var t=plain(collect());if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){say("Synthèse copiée");},function(){say("Copie impossible");});}else say("Copie impossible");});
  draw();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
