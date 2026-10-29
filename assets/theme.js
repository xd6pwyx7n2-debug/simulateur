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
