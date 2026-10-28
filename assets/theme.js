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
