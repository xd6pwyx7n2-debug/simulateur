/* Faire le point avant une reconversion : tout se passe dans le navigateur, rien n'est envoyé. */
(function(){"use strict";
var $=function(s,r){return(r||document).querySelector(s);},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
var KEY="sd-point-v1";
function E(t){return String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
var S={},CUR=0;
var COMP=["Écouter et conseiller","Organiser et planifier","Coordonner une équipe","Former et transmettre","Résoudre des problèmes","Analyser des données","Rédiger","Négocier et convaincre","Gérer un budget","Travailler de ses mains","Utiliser des outils numériques","Créer et concevoir","Garder son calme dans l'urgence","Apprendre vite","Prendre des décisions","Accompagner des personnes fragiles","Vendre","Réparer et dépanner","Gérer la relation client","Respecter des procédures","Parler en public","Parler une langue étrangère","Prendre des initiatives","Précision et rigueur"];
var MOTIFS=["Perte de sens","Conditions de travail","Rémunération","Évolution bloquée","Usure physique ou mentale","Métier ou secteur en difficulté","Envie de nouveauté","Équilibre avec la vie personnelle","Projet de création d'activité","Autre raison"];
var VALS=["Autonomie","Sécurité de l'emploi","Utilité aux autres","Créativité","Relations humaines","Progression de carrière","Équilibre vie pro et perso","Rémunération","Reconnaissance","Contact avec la nature","Travail en équipe","Apprentissage continu","Responsabilités","Variété des tâches","Calme, peu de pression","Esprit d'entreprise"];
var CRIT=[["envie","Envie"],["valeurs","Cohérence avec mes valeurs"],["faisab","Faisabilité (formation, délai, accès)"],["contr","Compatibilité avec mes contraintes"]];
var ACTIONS=[
 ["a_cep","Prendre rendez-vous avec un conseiller en évolution professionnelle (service gratuit)",[["Le conseil en évolution professionnelle (France Travail)","https://www.francetravail.fr/candidat/votre-projet-professionnel/definir-votre-projet-professionn/le-conseil-en-evolution-professi.html"]]],
 ["a_enq","Interroger deux ou trois personnes qui exercent le métier visé",[]],
 ["a_imm","Tester le métier par un stage, une immersion ou un bénévolat",[]],
 ["a_cpf","Vérifier mes droits CPF",[["Simulateur CPF","/simulateur-cpf/"]]],
 ["a_vae","Étudier une validation des acquis de l'expérience (VAE)",[["VAE : démarches et financement","/reconversion/vae/"]]],
 ["a_bil","Étudier un bilan de compétences avec un prestataire",[["Bilan de compétences : durée, coût, démarches","/reconversion/bilan-de-competences/"],["Modèle de lettre de demande de bilan de compétences","/modele-lettre-bilan-de-competences/"]]],
 ["a_fin","Chiffrer mes revenus pendant une formation",[["Chômage pendant une formation","/reconversion/chomage-pendant-formation/"],["Rémunération en transition professionnelle","/simulateur-remuneration-transition-professionnelle/"]]],
 ["a_dem","Anticiper une démission : préavis et droits",[["Démission pour reconversion","/simulateur-demission-reconversion/"],["Préavis de démission","/simulateur-preavis-demission/"]]],
 ["a_cre","Étudier une création d'activité",[["Créer un business plan","/guides/creer-un-business-plan-etapes-financement-seuil-rentabilite/"],["Simulateur micro-entrepreneur","/simulateur-micro-entrepreneur/"],["Ouvrir un commerce","/ouvrir-un-commerce/"]]],
 ["a_soin","Explorer les métiers du soin",[["Se reconvertir dans le soin","/reconversion/metiers-du-soin/"]]],
 ["a_cv","Mettre à jour mon CV",[["Générateur de CV","/generateur-cv/"]]]
];
var DELAI=[["","Échéance"],["Cette semaine","Cette semaine"],["Ce mois-ci","Ce mois-ci"],["Dans 3 mois","Dans 3 mois"],["Dans 6 mois","Dans 6 mois"]];
var STEPS=[
 {t:"Où j'en suis",ph:"Comprendre la demande",lead:"Avant de chercher des réponses, posons la question. Prenez le temps de dire pourquoi vous êtes là. Il n'y a pas de bonne ou de mauvaise réponse.",tip:"Écrivez comme vous parlez. Personne ne lira ces lignes, sauf vous.",
  f:[["sel","situation","Ma situation actuelle",["","Salarié","Indépendant","Demandeur d'emploi","En arrêt ou en congé","En études ou en formation","Autre situation"]],
     ["chips","motifs","Ce qui me pousse à réfléchir (plusieurs choix possibles)",MOTIFS],
     ["ta","declencheur","Qu'est-ce qui fait que je me pose la question maintenant ?"],
     ["ta","garder","Ce que j'aime dans mon activité actuelle et que je voudrais garder"],
     ["ta","fuir","Ce que je ne veux plus"],
     ["sel","delai","Dans quel délai je voudrais avoir changé ?",["","Je ne sais pas encore","Dans l'année","D'ici un à deux ans","Dans plus de deux ans"]]]},
 {t:"Ce que je sais faire",ph:"Investigation",lead:"Un projet solide s'appuie sur ce que vous avez déjà acquis, y compris en dehors du travail. On commence par faire l'inventaire.",tip:"Pensez aux tâches concrètes plutôt qu'aux intitulés de poste.",
  f:[["ta","exp","Mes expériences, diplômes et formations"],
     ["ta","fiertes","Trois réalisations dont je suis fier ou fière"],
     ["chips","comp","Mes compétences (choisissez celles qui vous correspondent)",COMP],
     ["ta","autres","Autres compétences : bénévolat, loisirs, vie de famille"],
     ["ta","manque","Ce que je ne sais pas encore faire et que je voudrais apprendre"]]},
 {t:"Ce qui compte pour moi",ph:"Investigation",lead:"Un métier peut correspondre à vos compétences et ne pas vous convenir. Les valeurs et les motivations font la différence.",tip:"Choisissez au plus trois valeurs indispensables. Les contraindre oblige à faire des choix.",
  f:[["vals","vals","Pour chaque valeur, indiquez son importance dans mon futur travail"],
     ["ta","energie","Les moments où je ne vois pas le temps passer au travail"],
     ["ta","epuise","Ce qui m'épuise le plus"]]},
 {t:"Mon cadre de vie",ph:"Investigation",lead:"Les contraintes ne sont pas des obstacles à cacher. Les poser tôt évite de bâtir un projet impossible à tenir.",tip:"Restez qualitatif. Les chiffres viendront plus tard, avec les simulateurs.",
  f:[["sel","rythme","Rythme de travail souhaité",["","Temps plein","Temps partiel","Horaires flexibles ou à la carte","Peu importe"]],
     ["sel","lieu","Mobilité géographique",["","Aucune, je reste où je suis","Dans ma région","Partout en France","Étranger envisageable"]],
     ["sel","formation","Durée de formation que j'accepterais",["","Aucune formation","Quelques semaines","Jusqu'à un an","Deux à trois ans","Plus long si le projet le justifie"]],
     ["sel","revenu","Baisse de revenu temporaire acceptable",["","Aucune","Légère","Importante pendant la formation","Je ne sais pas encore"]],
     ["sel","soutien","Soutien de mon entourage",["","Clair et enthousiaste","Partagé","À construire","Je n'en ai pas encore parlé"]],
     ["ta","contraintes","Autres contraintes : famille, santé, logement, finances"]]},
 {t:"Mes pistes",ph:"Investigation",lead:"Une piste peut être un métier, un secteur, ou une évolution dans votre métier actuel. Notez-en une à trois, puis évaluez chacune de 1 à 5.",tip:"Une note basse n'est pas un échec : elle indique ce qu'il faudrait lever pour que la piste devienne réaliste.",
  f:[["pistes"]]},
 {t:"Mon plan d'action",ph:"Conclusions",lead:"Une réflexion sans suite reste une réflexion. Choisissez les prochaines démarches, puis fixez-vous trois actions concrètes.",tip:"Trois actions petites et datées valent mieux qu'un grand plan jamais commencé.",
  f:[["ta","phrase","En une phrase, où j'en suis aujourd'hui"],["acts"],["acts3"]]}
];
function chk(g,v){return(S[g]||[]).indexOf(v)>-1;}
function fld(f,i){
  var k=f[1],id="pt-"+k;
  if(f[0]==="sel")return'<div class="field"><label for="'+id+'">'+E(f[2])+'</label><select id="'+id+'" data-k="'+k+'">'+f[3].map(function(o){return'<option value="'+E(o)+'">'+E(o||"Choisir")+"</option>";}).join("")+"</select></div>";
  if(f[0]==="ta")return'<div class="field"><label for="'+id+'">'+E(f[2])+'</label><textarea id="'+id+'" data-k="'+k+'" rows="3"></textarea></div>';
  if(f[0]==="chips")return'<fieldset class="pt-chips"><legend>'+E(f[2])+'</legend>'+f[3].map(function(o,j){return'<label class="pt-chip"><input type="checkbox" data-g="'+k+'" value="'+E(o)+'"><span>'+E(o)+"</span></label>";}).join("")+"</fieldset>";
  if(f[0]==="vals")return'<p>'+E(f[2])+'. <span class="pt-count" id="pt-vcount" aria-live="polite">Indispensables : 0 sur 3</span></p><div class="pt-vals">'+VALS.map(function(o,j){return'<div class="pt-val"><label for="pt-v'+j+'">'+E(o)+'</label><select id="pt-v'+j+'" data-v="'+E(o)+'"><option value="">Neutre</option><option value="i">Important</option><option value="x">Indispensable</option></select></div>';}).join("")+"</div>";
  if(f[0]==="pistes")return[1,2,3].map(function(n){return'<fieldset class="pt-pist"><legend>Piste '+n+(n>1?" (facultative)":"")+'</legend>'
    +'<div class="field"><label for="pt-pn'+n+'">Intitulé de la piste</label><input type="text" id="pt-pn'+n+'" data-k="pn'+n+'" autocomplete="off"></div>'
    +'<div class="field"><label for="pt-pa'+n+'">Ce qui m\'attire</label><textarea id="pt-pa'+n+'" data-k="pa'+n+'" rows="2"></textarea></div>'
    +'<div class="field"><label for="pt-pb'+n+'">Ce qu\'il me faudrait (diplôme, formation, expérience)</label><textarea id="pt-pb'+n+'" data-k="pb'+n+'" rows="2"></textarea></div>'
    +'<div class="field"><label for="pt-pq'+n+'">Une personne à interroger ou un lieu pour tester</label><input type="text" id="pt-pq'+n+'" data-k="pq'+n+'" autocomplete="off"></div>'
    +'<div class="pt-sc">'+CRIT.map(function(c){return'<div class="field"><label for="pt-s'+c[0]+n+'">'+E(c[1])+'</label><select id="pt-s'+c[0]+n+'" data-k="s'+c[0]+n+'"><option value="">Non évalué</option>'+[1,2,3,4,5].map(function(x){return'<option value="'+x+'">'+x+(x===1?" (faible)":x===5?" (fort)":"")+"</option>";}).join("")+"</select></div>";}).join("")+'</div>'
    +'<p class="pt-score" id="pt-sco'+n+'" aria-live="polite">Score : pas encore évalué</p></fieldset>';}).join("");
  if(f[0]==="acts")return'<fieldset class="pt-chips" style="display:block"><legend>Les démarches que je veux engager</legend>'+ACTIONS.map(function(a){return'<div style="margin:0 0 6px"><label style="font-weight:600"><input type="checkbox" data-g="acts" value="'+a[0]+'"> '+E(a[1])+"</label></div>";}).join("")+"</fieldset>";
  if(f[0]==="acts3")return'<fieldset class="pt-pist"><legend>Mes trois premières actions concrètes</legend>'+[1,2,3].map(function(n){return'<div class="cv-row two"><div class="field"><label for="pt-ac'+n+'">Action '+n+'</label><input type="text" id="pt-ac'+n+'" data-k="ac'+n+'" autocomplete="off"></div><div class="field"><label for="pt-ad'+n+'">Échéance</label><select id="pt-ad'+n+'" data-k="ad'+n+'">'+DELAI.map(function(o){return'<option value="'+E(o[0])+'">'+E(o[1])+"</option>";}).join("")+"</select></div></div>";}).join("")+"</fieldset>";
  return"";
}
function build(){
  var h='<div class="pt-bar" aria-hidden="true"><i id="pt-prog"></i></div><ol class="pt-nav" id="pt-nav">'+STEPS.map(function(s,i){return'<li><button type="button" data-go="'+i+'">'+(i+1)+". "+E(s.t)+"</button></li>";}).join("")+'<li><button type="button" data-go="6">Ma synthèse</button></li></ol>';
  STEPS.forEach(function(s,i){h+='<section class="pt-step" id="pt-s'+i+'" hidden aria-labelledby="pt-h'+i+'"><span class="pt-phase">Étape '+(i+1)+" sur 6 · "+E(s.ph)+'</span><h2 id="pt-h'+i+'" tabindex="-1">'+E(s.t)+'</h2><p class="pt-lead">'+E(s.lead)+'</p><p class="pt-tip">'+E(s.tip)+"</p>"+s.f.map(fld).join("")+"</section>";});
  h+='<section class="pt-step" id="pt-s6" hidden aria-labelledby="pt-h6"><span class="pt-phase">Conclusions</span><h2 id="pt-h6" tabindex="-1">Ma synthèse</h2><p class="pt-lead">Voici le document qui rassemble vos réponses. Relisez-le, complétez-le si besoin, puis enregistrez-le ou imprimez-le.</p><div id="pt-doc"></div><div class="pt-actions"><button type="button" class="pt-btn main" id="pt-pdf">Enregistrer en PDF ou imprimer</button><button type="button" class="pt-btn" id="pt-txt">Télécharger en texte (.txt)</button><button type="button" class="pt-btn" id="pt-copy">Copier le texte</button></div></section>';
  h+='<div class="pt-ctl"><button type="button" class="pt-btn" id="pt-prev">Étape précédente</button><button type="button" class="pt-btn main" id="pt-next">Étape suivante</button></div>';
  h+='<p class="pt-mem"><label><input type="checkbox" id="pt-mem"> Mémoriser mes réponses sur cet appareil uniquement</label> <button type="button" class="pt-btn danger" id="pt-memclear" hidden>Effacer les données mémorisées</button> <button type="button" class="pt-btn danger" id="pt-reset">Tout effacer et recommencer</button></p><p id="pt-live" class="sr-only" role="status" aria-live="polite"></p>';
  $("#pt-app").innerHTML=h;
}
function say(t){var l=$("#pt-live");if(l)l.textContent=t;}
function collect(){
  var d={};$$("#pt-app [data-k]").forEach(function(e){d[e.dataset.k]=e.value;});
  $$("#pt-app [data-g]").forEach(function(e){var g=e.dataset.g;d[g]=d[g]||[];if(e.checked)d[g].push(e.value);});
  d.vals={};$$("#pt-app [data-v]").forEach(function(e){if(e.value)d.vals[e.dataset.v]=e.value;});
  return d;
}
function fill(d){
  S=d||{};
  $$("#pt-app [data-k]").forEach(function(e){e.value=S[e.dataset.k]!=null?S[e.dataset.k]:"";});
  $$("#pt-app [data-g]").forEach(function(e){e.checked=chk(e.dataset.g,e.value);});
  $$("#pt-app [data-v]").forEach(function(e){e.value=(S.vals&&S.vals[e.dataset.v])||"";});
}
function score(n){var v=CRIT.map(function(c){return parseInt(S["s"+c[0]+n],10);}).filter(function(x){return x>0;});
  return v.length?{m:v.reduce(function(a,b){return a+b;},0)/v.length,n:v.length}:null;}
function fr1(x){return x.toFixed(1).replace(".",",");}
function pistes(){var r=[];[1,2,3].forEach(function(n){if(S["pn"+n]){r.push({n:n,nom:S["pn"+n],sc:score(n)});}});return r;}
function lines(){return S;}
function listOf(s){return String(s||"").split(/\n+/).map(function(x){return x.trim();}).filter(Boolean);}
function doc(){
  var h="",t=[],P=function(x){return x?"<p>"+E(x).replace(/\n/g,"<br>")+"</p>":"";};
  function sec(titre,html,txt){if(!html)return;h+="<h3>"+E(titre)+"</h3>"+html;t.push(titre.toUpperCase(),txt||"","");}
  h+="<h2>Mon point avant une reconversion</h2><p class=\"pt-small\">Document personnel établi le "+new Date().toLocaleDateString("fr-FR")+" avec l'outil gratuit de SimuDroit. Ce n'est pas un bilan de compétences au sens du Code du travail.</p>";
  t.push("MON POINT AVANT UNE RECONVERSION","Établi le "+new Date().toLocaleDateString("fr-FR"),"");
  if(S.phrase)sec("En une phrase",P(S.phrase),S.phrase);
  var a=[];if(S.situation)a.push("Situation : "+S.situation);if((S.motifs||[]).length)a.push("Ce qui me pousse : "+S.motifs.join(", "));if(S.delai)a.push("Délai souhaité : "+S.delai);
  var at=a.join("\n");
  var ah=a.length?"<ul>"+a.map(function(x){return"<li>"+E(x)+"</li>";}).join("")+"</ul>":"";
  [["declencheur","Ce qui déclenche la question"],["garder","À garder"],["fuir","Ce que je ne veux plus"]].forEach(function(p){if(S[p[0]]){ah+="<p><strong>"+E(p[1])+" :</strong> "+E(S[p[0]]).replace(/\n/g,"<br>")+"</p>";at+="\n"+p[1]+" : "+S[p[0]];}});
  sec("Mon point de départ",ah,at);
  var c="",ct="";
  [["exp","Expériences et formations"],["fiertes","Réalisations dont je suis fier ou fière"]].forEach(function(p){if(S[p[0]]){c+="<p><strong>"+E(p[1])+" :</strong> "+E(S[p[0]]).replace(/\n/g,"<br>")+"</p>";ct+=p[1]+" : "+S[p[0]]+"\n";}});
  if((S.comp||[]).length){c+="<p><strong>Compétences retenues :</strong> "+E(S.comp.join(", "))+".</p>";ct+="Compétences retenues : "+S.comp.join(", ")+"\n";}
  [["autres","Autres compétences"],["manque","À apprendre"]].forEach(function(p){if(S[p[0]]){c+="<p><strong>"+E(p[1])+" :</strong> "+E(S[p[0]]).replace(/\n/g,"<br>")+"</p>";ct+=p[1]+" : "+S[p[0]]+"\n";}});
  sec("Ce que je sais faire",c,ct.trim());
  var V=S.vals||{},vx=VALS.filter(function(x){return V[x]==="x";}),vi=VALS.filter(function(x){return V[x]==="i";});
  var vh="",vt="";
  if(vx.length){vh+="<p><strong>Indispensables :</strong> "+E(vx.join(", "))+".</p>";vt+="Indispensables : "+vx.join(", ")+"\n";}
  if(vi.length){vh+="<p><strong>Importantes :</strong> "+E(vi.join(", "))+".</p>";vt+="Importantes : "+vi.join(", ")+"\n";}
  [["energie","Ce qui me donne de l'énergie"],["epuise","Ce qui m'épuise"]].forEach(function(p){if(S[p[0]]){vh+="<p><strong>"+E(p[1])+" :</strong> "+E(S[p[0]]).replace(/\n/g,"<br>")+"</p>";vt+=p[1]+" : "+S[p[0]]+"\n";}});
  sec("Ce qui compte pour moi",vh,vt.trim());
  var kh="",kt="";
  [["rythme","Rythme"],["lieu","Mobilité"],["formation","Formation acceptable"],["revenu","Baisse de revenu acceptable"],["soutien","Soutien de l'entourage"],["contraintes","Autres contraintes"]].forEach(function(p){if(S[p[0]]){kh+="<li>"+E(p[1])+" : "+E(S[p[0]])+"</li>";kt+=p[1]+" : "+S[p[0]]+"\n";}});
  sec("Mon cadre de vie",kh?"<ul>"+kh+"</ul>":"",kt.trim());
  var ps=pistes();
  if(ps.length){
    var sorted=ps.slice().sort(function(x,y){return(y.sc?y.sc.m:-1)-(x.sc?x.sc.m:-1);});
    var th="<table><tr><th>Piste</th><th>Score moyen</th><th>Ce qu'il me faudrait</th><th>À interroger ou tester</th></tr>",tt="";
    sorted.forEach(function(p){var n=p.n;th+="<tr><td>"+E(p.nom)+"</td><td>"+(p.sc?E(fr1(p.sc.m))+" sur 5":"non évalué")+"</td><td>"+E(S["pb"+n]||"")+"</td><td>"+E(S["pq"+n]||"")+"</td></tr>";
      tt+=p.nom+" : "+(p.sc?fr1(p.sc.m)+" sur 5":"non évalué")+(S["pa"+n]?"\n  Ce qui m'attire : "+S["pa"+n]:"")+(S["pb"+n]?"\n  Ce qu'il me faudrait : "+S["pb"+n]:"")+(S["pq"+n]?"\n  À interroger ou tester : "+S["pq"+n]:"")+"\n";});
    th+="</table><p class=\"pt-small\">Le score est la moyenne des critères que vous avez notés (envie, valeurs, faisabilité, contraintes). C'est une aide à la réflexion, pas un classement de métiers.</p>";
    sec("Mes pistes",th,tt.trim());
  }
  var ac=S.acts||[],links=[],seen={},ah2="",at2="";
  ACTIONS.forEach(function(x){if(ac.indexOf(x[0])>-1){ah2+="<li>"+E(x[1])+"</li>";at2+="- "+x[1]+"\n";x[2].forEach(function(l){if(!seen[l[1]]){seen[l[1]]=1;links.push(l);}});}});
  var m3="";[1,2,3].forEach(function(n){if(S["ac"+n]){m3+="<li>"+E(S["ac"+n])+(S["ad"+n]?" ("+E(S["ad"+n])+")":"")+"</li>";at2+=n+". "+S["ac"+n]+(S["ad"+n]?" ("+S["ad"+n]+")":"")+"\n";}});
  var xh=(ah2?"<p><strong>Démarches à engager :</strong></p><ul>"+ah2+"</ul>":"")+(m3?"<p><strong>Mes trois premières actions :</strong></p><ol>"+m3+"</ol>":"");
  sec("Mon plan d'action",xh,at2.trim());
  if(links.length){var lh="<ul>"+links.map(function(l){var u=l[1].charAt(0)==="/"?"https://simudroit.fr"+l[1]:l[1];return'<li><a href="'+E(u)+'">'+E(l[0])+"</a> ("+E(u)+")</li>";}).join("")+"</ul>";
    sec("Pour aller plus loin",lh,links.map(function(l){return"- "+l[0]+" : "+(l[1].charAt(0)==="/"?"https://simudroit.fr"+l[1]:l[1]);}).join("\n"));}
  if(!t.slice(3).length){h+='<p>Votre synthèse se remplira au fur et à mesure de vos réponses.</p>';}
  h+="<p class=\"pt-small\">Pour un accompagnement personnalisé et gratuit, le conseil en évolution professionnelle est ouvert à tous les actifs. Les montants et conditions de financement doivent être vérifiés auprès des organismes officiels avant toute décision.</p>";
  t.push("Pour un accompagnement personnalisé et gratuit, le conseil en évolution professionnelle est ouvert à tous les actifs. Vérifiez les conditions de financement auprès des organismes officiels avant toute décision.");
  return{html:h,text:t.join("\n")};
}
function updScores(){[1,2,3].forEach(function(n){var s=score(n),o=$("#pt-sco"+n);if(o)o.textContent=s?"Score moyen : "+fr1(s.m)+" sur 5 ("+s.n+" critère"+(s.n>1?"s":"")+" noté"+(s.n>1?"s":"")+")":"Score : pas encore évalué";});}
function updVals(){var x=VALS.filter(function(v){return S.vals&&S.vals[v]==="x";}).length,o=$("#pt-vcount");if(o)o.textContent="Indispensables : "+x+" sur 3"+(x>3?" (trop nombreux, gardez-en trois au maximum)":"");}
function save(){var on=$("#pt-mem");if(on&&on.checked){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}}
function load(){try{return JSON.parse(localStorage.getItem(KEY)||"null");}catch(e){return null;}}
function show(i){
  CUR=Math.max(0,Math.min(6,i));
  $$(".pt-step").forEach(function(s,j){s.hidden=j!==CUR;});
  $$("#pt-nav button").forEach(function(b,j){if(j===CUR)b.setAttribute("aria-current","step");else b.removeAttribute("aria-current");b.classList.toggle("done",j<CUR);});
  $("#pt-prog").style.width=(CUR/6*100)+"%";
  $("#pt-prev").hidden=CUR===0;$("#pt-next").hidden=CUR===6;
  $("#pt-next").textContent=CUR===5?"Voir ma synthèse":"Étape suivante";
  if(CUR===6){var d=doc();$("#pt-doc").innerHTML=d.html;}
  var hd=$("#pt-h"+CUR);if(hd)hd.focus();
  say(CUR===6?"Synthèse":"Étape "+(CUR+1)+" sur 6 : "+STEPS[CUR].t);
}
function dl(name,text,type){var b=new Blob([text],{type:type}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);}
function init(){
  build();
  var saved=load();if(saved){fill(saved);var m=$("#pt-mem");m.checked=true;$("#pt-memclear").hidden=false;}
  S=collect();updScores();updVals();
  $("#pt-app").addEventListener("input",function(ev){if(!ev.target.matches("[data-k],[data-g],[data-v]"))return;S=collect();updScores();updVals();save();});
  $("#pt-app").addEventListener("change",function(ev){if(!ev.target.matches("[data-k],[data-g],[data-v]"))return;S=collect();updScores();updVals();save();});
  $("#pt-nav").addEventListener("click",function(ev){var b=ev.target.closest("[data-go]");if(b)show(parseInt(b.dataset.go,10));});
  $("#pt-prev").addEventListener("click",function(){show(CUR-1);});
  $("#pt-next").addEventListener("click",function(){show(CUR+1);});
  $("#pt-pdf").addEventListener("click",function(){window.print();});
  $("#pt-txt").addEventListener("click",function(){dl("mon-point-reconversion.txt",doc().text,"text/plain;charset=utf-8");});
  $("#pt-copy").addEventListener("click",function(){var t=doc().text;if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){say("Texte copié");},function(){say("Copie impossible");});}else say("Copie impossible sur ce navigateur");});
  $("#pt-mem").addEventListener("change",function(){if(this.checked){$("#pt-memclear").hidden=false;save();}else{try{localStorage.removeItem(KEY);}catch(e){}$("#pt-memclear").hidden=true;}});
  $("#pt-memclear").addEventListener("click",function(){try{localStorage.removeItem(KEY);}catch(e){}$("#pt-mem").checked=false;this.hidden=true;say("Données effacées");});
  $("#pt-reset").addEventListener("click",function(){if(!window.confirm("Effacer toutes vos réponses ?"))return;try{localStorage.removeItem(KEY);}catch(e){}$("#pt-mem").checked=false;$("#pt-memclear").hidden=true;fill({});S=collect();updScores();updVals();show(0);say("Réponses effacées");});
  show(0);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
