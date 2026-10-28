(function(){
  var KEY="sd-theme",root=document.documentElement,t=null;
  try{t=localStorage.getItem(KEY)}catch(e){}
  if(t!=="dark"&&t!=="light"){t=(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light"}
  root.setAttribute("data-theme",t);
  function label(th){return th==="dark"?"Passer en mode clair":"Passer en mode sombre"}
  function init(){
    if(document.getElementById("sd-theme"))return;
    var b=document.createElement("button");
    b.id="sd-theme";b.type="button";
    function paint(){var th=root.getAttribute("data-theme");b.textContent=th==="dark"?"☀️":"🌙";b.setAttribute("aria-label",label(th));b.title=label(th)}
    b.addEventListener("click",function(){
      var n=root.getAttribute("data-theme")==="dark"?"light":"dark";
      root.setAttribute("data-theme",n);try{localStorage.setItem(KEY,n)}catch(e){}paint();
    });
    paint();document.body.appendChild(b);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
