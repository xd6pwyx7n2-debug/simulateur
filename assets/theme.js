(function(){
  var KEY="sd-theme",root=document.documentElement,t=null;
  try{t=localStorage.getItem(KEY)}catch(e){}
  if(t!=="dark"&&t!=="light"){t=(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light"}
  root.setAttribute("data-theme",t);
  var btns=[];
  function paint(){
    var dark=root.getAttribute("data-theme")==="dark";
    var lab=dark?"Passer en mode clair":"Passer en mode sombre";
    btns.forEach(function(b){
      b.setAttribute("aria-label",lab);b.setAttribute("aria-pressed",dark?"true":"false");b.title=lab;
      var ic=b.querySelector(".ic"),tx=b.querySelector(".tx");
      if(ic)ic.textContent=dark?"\u2600\uFE0F":"\uD83C\uDF19";
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
    if(window.matchMedia)matchMedia("(min-width:761px)").addEventListener("change",function(m){if(m.matches)set(false);});
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
