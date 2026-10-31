/* Anciennes adresses (Netlify, github.io) : renvoi vers le domaine officiel */
(function(){try{var h=location.hostname;if(/\.netlify\.app$/.test(h)||/\.github\.io$/.test(h)){var path=location.pathname.replace(/^\/simulateur(?=\/|$)/,"")||"/";location.replace("https://simudroit.fr"+path+location.search+location.hash);}}catch(e){}})();
(function(){
  var KEY="sd-theme",root=document.documentElement,t=null;
  try{t=localStorage.getItem(KEY)}catch(e){}
  if(t!=="dark"&&t!=="light"){t=(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light"}
  root.setAttribute("data-theme",t);
  var btns=[];
  var MOON='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13.2A8.5 8.5 0 1 1 10.8 3a6.7 6.7 0 0 0 10.2 10.2z"/></svg>',SUN='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.3M12 19.2v2.3M2.5 12h2.3M19.2 12h2.3M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>';
  function paint(){
    var dark=root.getAttribute("data-theme")==="dark";
    var lab=dark?"Passer en mode clair":"Passer en mode sombre";
    btns.forEach(function(b){
      b.setAttribute("aria-label",lab);b.setAttribute("aria-pressed",dark?"true":"false");b.title=lab;
      var ic=b.querySelector(".ic"),tx=b.querySelector(".tx");
      if(ic)ic.innerHTML=dark?SUN:MOON;
      if(tx)tx.textContent=dark?"Mode clair":"Mode sombre";
    });
  }
  function toggle(){
    var n=root.getAttribute("data-theme")==="dark"?"light":"dark";
    root.setAttribute("data-theme",n);try{localStorage.setItem(KEY,n)}catch(e){}paint();
  }
  function make(cls){
    var b=document.createElement("button");b.type="button";b.className="sd-theme "+cls;
    b.innerHTML='<span class="ic" aria-hidden="true"></span><span class="tx"></span>';
    b.addEventListener("click",toggle);btns.push(b);return b;
  }
  function init(){
    if(document.getElementById("sd-theme"))return;
    var f=make("sd-theme-float");f.id="sd-theme";document.body.appendChild(f);
    paint();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

/* Installation en application et lecture hors ligne */
(function () { try { if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("/sw.js"); } catch (e) {} })();

/* Menu mobile : les liens de l'en-tête passent dans un panneau déroulant sous le logo */
(function(){
  function init(){
    var h=document.querySelector("header");if(!h||h.querySelector(".sd-burger"))return;
    var nav=h.querySelector("nav");if(!nav)return;
    if(!nav.id)nav.id="sd-nav";
    var b=document.createElement("button");b.type="button";b.className="sd-burger";b.setAttribute("aria-expanded","false");b.setAttribute("aria-controls",nav.id);
    b.innerHTML='<span class="sd-burger-i" aria-hidden="true"></span><span>Menu</span>';
    nav.parentNode.insertBefore(b,nav);h.classList.add("sd-menu-on");
    function set(open){nav.classList.toggle("sd-open",open);b.setAttribute("aria-expanded",open?"true":"false");b.classList.toggle("on",open);}
    b.addEventListener("click",function(e){e.stopPropagation();set(!nav.classList.contains("sd-open"));});
    nav.addEventListener("click",function(e){if(e.target.closest("a"))set(false);});
    document.addEventListener("click",function(e){if(!h.contains(e.target))set(false);});
    document.addEventListener("keydown",function(e){if(e.key==="Escape"&&nav.classList.contains("sd-open")){set(false);b.focus();}});
    if(window.matchMedia)matchMedia("(min-width:1061px)").addEventListener("change",function(m){if(m.matches)set(false);});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

/* Exclure ses propres visites des statistiques : ouvrir une page avec ?exclure-mes-visites=1 (annuler avec =0). Valable pour le navigateur utilisé. */
(function(){
  try{
    var m=location.search.match(/[?&]exclure-mes-visites=([01])/);
    if(!m)return;
    if(m[1]==="1")localStorage.setItem("plausible_ignore","true");else localStorage.removeItem("plausible_ignore");
  }catch(e){}
})();

/* Étiquette au-dessus du titre principal (selon le type de page) */
(function(){
  try{
    var p=location.pathname.replace(/\/index\.html$/,"/"),k=null;
    if(/^\/simulateur-/.test(p))k="Simulateur gratuit";
    else if(p==="/simulateurs/")k="Tous les simulateurs";
    else if(p==="/guides/")k="Guides pratiques";
    else if(/^\/guides\//.test(p))k="Guide pratique";
    else if(/^\/modeles-de-lettres/.test(p))k="Modèles de lettres";
    else if(/^\/faq/.test(p))k="Questions fréquentes";
    else if(/^\/glossaire/.test(p))k="Glossaire";
    else if(/^\/parcours/.test(p))k="Parcours";
    else if(/^\/exemples-/.test(p))k="Exemples chiffrés";
    else if(/^\/independants/.test(p))k="Indépendants";
    else if(/^\/assistant/.test(p))k="Assistant";
    else if(/^\/a-propos/.test(p))k="À propos";
    else if(/^\/contact/.test(p))k="Contact";
    else if(/^\/(mentions-legales|confidentialite)/.test(p))k="Informations légales";
    else if(/^\/integrer/.test(p))k="Intégrer un simulateur";
    else if(/^\/methode-et-sources/.test(p))k="Méthode et sources";
    if(k)document.documentElement.style.setProperty("--sd-eyebrow",'"'+k+'"');
  }catch(e){}
})();

/* Bandeau « base du calcul » sous chaque résultat : règle, source, date de vérification */
(function(){try{
  var VERIF="2026-10-17",VERIF_FR="17 octobre 2026";
  var m=location.pathname.match(/simulateur-([a-z0-9-]+)/);if(!m)return;var slug=m[1];
  var P=window.SD_PARAMS;function eu(x){return x.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €"}function pc(x){return (x*100).toLocaleString("fr-FR",{maximumFractionDigits:1})+" %"}
  var B={
   "indemnite-licenciement":["1/4 de mois de salaire de référence par année jusqu’à 10 ans, puis 1/3 au-delà ; salaire de référence = moyenne la plus favorable (12 ou 3 derniers mois) ; ancienneté minimale de 8 mois (articles L1234-9, R1234-2, R1234-4).","Service-Public.fr","https://www.service-public.fr/particuliers/vosdroits/F987"],
   "rupture-conventionnelle":["indemnité au moins égale à l’indemnité légale de licenciement (article L1237-13).","Code du travail numérique","https://code.travail.gouv.fr/"],
   "chomage":[P&&P.are?(pc(P.are.taux1)+" du salaire journalier de référence + "+eu(P.are.partFixe)+", ou "+pc(P.are.taux2)+" de ce salaire si c’est plus élevé, dans la limite de "+pc(P.are.plafondTauxSjr)+" du salaire journalier de référence, minimum "+eu(P.are.minJour)+" par jour (règlement d’assurance chômage)."):"règles du règlement d’assurance chômage (Unédic).","Unédic","https://www.unedic.org/"],
   "conges-payes":["le plus favorable entre le maintien du salaire et le dixième de la rémunération brute de la période de référence (article L3141-24).","Article L3141-24 (Légifrance)","https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049461568/"],
   "heures-supplementaires":["majoration de 25 % pour les 8 premières heures supplémentaires, puis 50 %, sauf accord ou convention plus favorable (article L3121-33).","Code du travail numérique","https://code.travail.gouv.fr/"],
   "prime-precarite":["10 % de la rémunération brute totale versée pendant le contrat, sauf cas d’exclusion (article L1243-8).","Code du travail numérique","https://code.travail.gouv.fr/"],
   "smic":[P&&P.smic?("taux horaire brut de "+eu(P.smic.horaire)+" en vigueur depuis le "+new Date(P.smic.depuis+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})+", multiplié par la durée du travail."):"taux horaire brut du SMIC en vigueur, multiplié par la durée du travail.","info.gouv.fr","https://www.info.gouv.fr/"],
   "indemnites-journalieres-maladie":["salariés : 50 % du salaire journalier de base, plafonné à 1,4 SMIC, après 3 jours de carence ; indépendants : règles spécifiques.","ameli.fr","https://www.ameli.fr/entreprise/vos-salaries/arret-de-travail/indemnites-journalieres"],
   "solde-tout-compte":["somme des éléments dus à la fin du contrat (salaire, congés non pris, indemnités éventuelles).","Code du travail numérique","https://code.travail.gouv.fr/fiche-service-public/solde-de-tout-compte"]
  };
  function add(){
    var r=document.querySelector(".result");if(!r||r.querySelector(".sd-basis"))return;
    var b=B[slug],h='';
    if(b)h+='<strong>Règle appliquée :</strong> '+b[0]+' <strong>Source :</strong> <a href="'+b[2]+'" target="_blank" rel="noopener noreferrer">'+b[1]+'</a>. ';
    h+='Barèmes vérifiés le <time datetime="'+VERIF+'">'+VERIF_FR+'</time> · <a href="/methode-et-sources/">Méthode et sources</a>';
    var p=document.createElement("p");p.className="sd-basis";p.innerHTML=h;r.appendChild(p);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",add);else add();
}catch(e){}})();

/* Export agenda (.ics) de la date de fin affichée par les simulateurs de préavis et de période d'essai */
(function(){function init(){
  var out=document.getElementById("dateFin");if(!out||!(document.getElementById("result")||document.getElementById("resultat")))return;
  var MOIS=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  var box=document.createElement("p");box.className="sd-ics";box.hidden=true;
  var btn=document.createElement("button");btn.type="button";btn.className="sd-ics-btn";btn.textContent="Ajouter l'échéance à mon agenda (.ics)";
  var help=document.createElement("span");help.className="sd-ics-help";help.textContent=" Rappels 7 jours et 1 jour avant. Fichier créé sur votre appareil, rien n'est envoyé.";
  box.appendChild(btn);box.appendChild(help);
  var res=document.getElementById("result")||document.getElementById("resultat");if(!res)return;res.appendChild(box);
  var cur=null;
  function parse(){
    var t=(out.textContent||"").toLowerCase().replace(/\s+/g," "),m=t.match(/(\d{1,2})(?:er)? ([a-zéûà]+) (\d{4})/);
    if(!m)return null;var i=MOIS.indexOf(m[2]);if(i<0)return null;return {y:+m[3],m:i+1,d:+m[1]};
  }
  function upd(){cur=parse();box.hidden=!cur}
  new MutationObserver(upd).observe(out,{childList:true,characterData:true,subtree:true});upd();
  function p2(n){return (n<10?"0":"")+n}
  btn.addEventListener("click",function(){
    if(!cur)return;
    var d=new Date(cur.y,cur.m-1,cur.d),n=new Date(cur.y,cur.m-1,cur.d+1);
    var f=function(x){return x.getFullYear()+p2(x.getMonth()+1)+p2(x.getDate())};
    var h1=(document.querySelector("h1")||{}).textContent||"Échéance";
    var title="Fin : "+h1.replace(/\s+/g," ").trim();
    var now=new Date(),st=now.getUTCFullYear()+p2(now.getUTCMonth()+1)+p2(now.getUTCDate())+"T"+p2(now.getUTCHours())+p2(now.getUTCMinutes())+p2(now.getUTCSeconds())+"Z";
    var L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SimuDroit//FR","CALSCALE:GREGORIAN","BEGIN:VEVENT","UID:"+f(d)+"-"+Math.random().toString(36).slice(2)+"@simudroit.fr","DTSTAMP:"+st,"DTSTART;VALUE=DATE:"+f(d),"DTEND;VALUE=DATE:"+f(n),"SUMMARY:"+title,"DESCRIPTION:Date estimée avec SimuDroit (https://simudroit.fr). À vérifier avec votre contrat ou votre convention collective.",
      "BEGIN:VALARM","TRIGGER:-P7D","ACTION:DISPLAY","DESCRIPTION:Dans 7 jours","END:VALARM","BEGIN:VALARM","TRIGGER:-P1D","ACTION:DISPLAY","DESCRIPTION:Demain","END:VALARM","END:VEVENT","END:VCALENDAR"];
    var blob=new Blob([L.join("\r\n")+"\r\n"],{type:"text/calendar;charset=utf-8"}),a=document.createElement("a");
    a.href=URL.createObjectURL(blob);a.download="echeance-simudroit.ics";document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500);
  });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init()})();

/* Ligne de parcours : centre l'étape courante sur mobile */
(function(){function c(){var l=document.querySelector(".sd-line .cur"),s=document.querySelector(".sd-line-scroll");if(!l||!s||s.scrollWidth<=s.clientWidth)return;s.scrollLeft=l.offsetLeft-(s.clientWidth-l.offsetWidth)/2}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",c);else c()})();
/* Bandeau de nouveauté : générateur de CV (fermable, mémorisé sur l'appareil) */
(function(){
  try{
    if(/^\/generateur-cv\/?$/.test(location.pathname))return;
    var K="sd-news-cv-1";try{if(localStorage.getItem(K))return;}catch(e){}
    function go(){
      if(document.getElementById("sd-news"))return;
      var d=document.createElement("div");d.id="sd-news";d.className="sd-news";d.setAttribute("role","region");d.setAttribute("aria-label","Nouveauté");
      d.innerHTML='<a href="/generateur-cv/"><span class="sd-news-tag">Nouveau</span><span class="sd-news-txt">Générateur de CV gratuit : un style unique à chaque CV</span><span class="sd-news-go">Essayer</span></a><button type="button" aria-label="Fermer l\'annonce">&times;</button>';
      var h=document.querySelector("header")||document.body.firstChild;
      h.parentNode.insertBefore(d,h);
      d.querySelector("button").addEventListener("click",function(){try{localStorage.setItem(K,"1");}catch(e){}d.remove();});
    }
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go();
  }catch(e){}
})();
