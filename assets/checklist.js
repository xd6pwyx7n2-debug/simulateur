/* Checklists à cocher : progression, mémorisation facultative sur l'appareil (aucune donnée envoyée). */
(function(){
  var lists=document.querySelectorAll("ul.cl[data-cl]");if(!lists.length)return;
  lists.forEach(function(ul){
    var key="sd-cl-"+ul.getAttribute("data-cl"),boxes=ul.querySelectorAll('input[type="checkbox"]'),st={};
    try{st=JSON.parse(localStorage.getItem(key)||"{}")||{};}catch(e){st={};}
    var prog=document.createElement("p");prog.className="cl-prog";prog.setAttribute("role","status");prog.setAttribute("aria-live","polite");ul.parentNode.insertBefore(prog,ul.nextSibling);
    function upd(){var n=0;boxes.forEach(function(b){if(b.checked)n++;});prog.textContent=n+" étape"+(n>1?"s":"")+" sur "+boxes.length+" cochée"+(n>1?"s":"")+(n===boxes.length?" : bravo, votre dossier est prêt à être vérifié avec les administrations.":"");}
    boxes.forEach(function(b,i){b.id=b.id||("cl-"+ul.getAttribute("data-cl")+"-"+i);if(st[i])b.checked=true;
      b.addEventListener("change",function(){st[i]=b.checked?1:0;try{localStorage.setItem(key,JSON.stringify(st));}catch(e){}upd();});});
    upd();
  });
})();
