/* Calcul détaillé des cotisations salariales 2026 (salarié non cadre, régime général, mensuel).
   Taux : Urssaf 2026 (vieillesse, CSG, CRDS) et Agirc-Arrco 2026. Plafond mensuel de la Sécurité sociale : 4 005 €. */
(function(){
  var PSS=4005;
  function r2(x){return Math.round((x+1e-9)*100)/100}
  function lignes(brut){
    var t1=Math.min(brut,PSS),t2=Math.max(Math.min(brut-PSS,7*PSS),0);
    var ass=brut<=4*PSS?brut*0.9825:4*PSS*0.9825+(brut-4*PSS);
    var L=[["Vieillesse plafonnée","6,9 %",0.069*t1,true],["Vieillesse déplafonnée","0,4 %",0.004*brut,true],
      ["Retraite complémentaire Agirc-Arrco, tranche 1","3,15 %",0.0315*t1,true],["Contribution d'équilibre général (CEG), tranche 1","0,86 %",0.0086*t1,true]];
    if(t2>0){L.push(["Retraite complémentaire Agirc-Arrco, tranche 2","8,64 %",0.0864*t2,true]);L.push(["Contribution d'équilibre général (CEG), tranche 2","1,08 %",0.0108*t2,true])}
    if(brut>PSS)L.push(["Contribution d'équilibre technique (CET)","0,14 %",0.0014*(t1+t2),true]);
    L.push(["CSG déductible","6,8 % de 98,25 %",0.068*ass,true],["CSG non déductible","2,4 % de 98,25 %",0.024*ass,false],["CRDS","0,5 % de 98,25 %",0.005*ass,false]);
    var out=L.map(function(l){return {nom:l[0],taux:l[1],montant:r2(l[2]),deductible:l[3]}});
    var tot=r2(out.reduce(function(s,l){return s+l.montant},0)),ded=r2(out.filter(function(l){return l.deductible}).reduce(function(s,l){return s+l.montant},0));
    return {lignes:out,total:tot,netAvantImpot:r2(brut-tot),netImposable:r2(brut-ded)};
  }
  window.SD_PAIE={lignes:lignes,r2:r2,PSS:PSS};
})();
