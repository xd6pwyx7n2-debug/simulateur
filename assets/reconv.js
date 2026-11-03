(function(){
  var cards=document.querySelectorAll('.rc-card');
  if(!cards.length)return;
  var root=document.querySelector('.rc-wrap');
  root.classList.add('rc-js');
  var panels=document.querySelectorAll('.rc-panel');
  panels.forEach(function(p){p.hidden=true});
  function show(card){
    var id=card.getAttribute('aria-controls');
    var open=card.getAttribute('aria-expanded')==='true';
    cards.forEach(function(c){c.setAttribute('aria-expanded','false')});
    panels.forEach(function(p){p.hidden=true});
    if(open)return;
    card.setAttribute('aria-expanded','true');
    var p=document.getElementById(id);
    p.hidden=false;
    var r=p.getBoundingClientRect();
    if(r.bottom>window.innerHeight||r.top<0){
      var rm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      p.scrollIntoView({block:'nearest',behavior:rm?'auto':'smooth'});
    }
  }
  cards.forEach(function(c){c.addEventListener('click',function(){show(c)})});
})();
