/* Fiches de révision : export PDF (impression) et partage */
(function(){
  var art=document.querySelector("article");if(!art||!document.querySelector(".fiche-actions"))return;
  var $=function(s){return document.querySelector(s)};
  var msg=$(".fiche-msg");
  function say(t){if(msg){msg.textContent=t;setTimeout(function(){msg.textContent=""},4000)}}
  function pdf(){
    var old=document.getElementById("sd-print");if(old)old.remove();
    var h1=art.querySelector("h1"),title=h1?h1.textContent.trim():document.title;
    var introEl=art.querySelector(".fiche-hero .intro");var clone=art.cloneNode(true);
    ["script",".fiche-actions",".crumbs",".fiche-hero","h1",".sd-see-grid"].forEach(function(s){clone.querySelectorAll(s).forEach(function(n){n.remove()})});
    clone.querySelectorAll("h2").forEach(function(h){if(/entraîner et approfondir/.test(h.textContent))h.remove()});
    clone.querySelectorAll("details").forEach(function(d){d.setAttribute("open","")});
    clone.querySelectorAll("a").forEach(function(a){a.replaceWith(document.createTextNode(a.textContent))});
    var div=document.createElement("div");div.id="sd-print";
    div.innerHTML='<div class="pr-band"><span class="pr-logo">Simu<span>Droit</span></span><span class="pr-tag">Fiche de révision</span></div><h1></h1><div class="meta">Chiffres 2026, vérifiés le 30 octobre 2026</div>';
    div.querySelector("h1").textContent=title;
    if(introEl){var ip=document.createElement("p");ip.className="intro";ip.textContent=introEl.textContent;clone.insertBefore(ip,clone.firstChild)}div.appendChild(clone);
    var f=document.createElement("div");f.className="foot";f.innerHTML="<span>"+location.href+"</span><span>SimuDroit : simulateurs gratuits de droit du travail et de salaire.</span>";div.appendChild(f);
    document.body.appendChild(div);
    var t0=document.title;document.title="Fiche de révision - "+title+" - SimuDroit";
    var done=function(){var p=document.getElementById("sd-print");if(p)p.remove();document.title=t0;window.removeEventListener("afterprint",done)};
    window.addEventListener("afterprint",done);
    setTimeout(function(){window.print()},60);
  }
  function share(){
    var d={title:document.title,text:(art.querySelector("h1")||{}).textContent+" : fiche de révision SimuDroit",url:location.href.split("#")[0]};
    if(navigator.share){navigator.share(d).catch(function(){});return}
    var copy=function(){say("Lien copié : collez-le où vous voulez.")};
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(d.url).then(copy,function(){say(d.url)})}else{say(d.url)}
  }
  var b1=$(".fiche-pdf"),b2=$(".fiche-share");
  if(b1)b1.addEventListener("click",pdf);if(b2)b2.addEventListener("click",share);
})();
