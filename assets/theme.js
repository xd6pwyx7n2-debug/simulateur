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
    else if(/^\/employeurs-rh/.test(p))k="Employeurs";
    else if(/^\/litiges/.test(p))k="Guides";
    else if(/^\/quiz-droits/.test(p))k="Guides";
    else if(/^\/quiz-droit-du-travail/.test(p))k="Guides";
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
   "smic":[P&&P.smic?("taux horaire brut de "+eu(P.smic.horaire)+" en vigueur depuis le "+new Date(P.smic.depuis+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})+", multiplié par la durée du travail."):"taux horaire brut du SMIC en vigueur, multiplié par la durée du travail.","Service-Public.gouv.fr, fiche F2300 (Smic)","https://www.service-public.gouv.fr/particuliers/vosdroits/F2300","2026-11-01"," Fiche vérifiée le 1er juin 2026 (12,31 € de l’heure, 1 867,02 € brut par mois à 35 heures). Mensualisation : taux horaire × durée hebdomadaire × 52 ÷ 12 ; pour une autre durée que 35 heures, c’est la méthode proportionnelle de SimuDroit. Le Smic net est une estimation à partir du rapport net/brut publié par info.gouv.fr."],
   "indemnites-journalieres-maladie":["salariés : 50 % du salaire journalier de base, plafonné à 1,4 SMIC, après 3 jours de carence ; indépendants : règles spécifiques.","ameli.fr","https://www.ameli.fr/entreprise/vos-salaries/arret-de-travail/indemnites-journalieres"],
   "solde-tout-compte":["somme des éléments dus à la fin du contrat (salaire, congés non pris, indemnités éventuelles).","Code du travail numérique","https://code.travail.gouv.fr/fiche-service-public/solde-de-tout-compte"],
   "indemnite-depart-retraite":["départ volontaire : 1/2 mois de salaire de référence à partir de 10 ans d’ancienneté, 1 mois à 15 ans, 1,5 mois à 20 ans, 2 mois à 30 ans ; mise à la retraite par l’employeur : indemnité légale de licenciement (1/4 de mois par année jusqu’à 10 ans, puis 1/3), avec au moins 8 mois d’ancienneté ; salaire de référence = le plus favorable entre la moyenne des 12 derniers mois et celle des 3 derniers mois (articles D1237-1 et suivants, L1237-7 et L1234-9 du Code du travail).","Service-Public.gouv.fr, fiche F13965","https://www.service-public.gouv.fr/particuliers/vosdroits/F13965","2026-11-01"," Fiche mise à jour le 1er janvier 2026. Une convention collective peut prévoir un montant plus favorable. Voir aussi la fiche sur <a href='https://www.service-public.gouv.fr/particuliers/vosdroits/F987' target='_blank' rel='noopener noreferrer'>indemnité légale de licenciement (F987)</a>."],
   "preavis-demission":["la loi ne fixe pas la durée du préavis de démission : elle vient de la convention ou de l’accord collectif, du contrat de travail ou, à défaut, des usages ; le préavis se compte de date à date à partir de la notification.","Service-Public.gouv.fr, fiche F2883","https://www.service-public.gouv.fr/particuliers/vosdroits/F2883","2026-11-01"," Fiche vérifiée le 8 juillet 2026. Pour une durée en mois, le simulateur affiche le dernier jour inclus (notification le 8 juillet, 1 mois : jusqu’au 7 août). Pour une durée en jours ou en semaines, la fiche ne précise pas le décompte : le jour de la notification n’est pas compté. Voir aussi <a href='https://code.travail.gouv.fr/contribution/quelle-est-la-duree-du-preavis-en-cas-de-demission' target='_blank' rel='noopener noreferrer'>le Code du travail numérique</a>."],
   "prorata-salaire":["salaire mensuel brut × jours de présence ÷ jours du mois, en jours calendaires, ouvrables ou ouvrés selon la méthode choisie.","Définition du prorata temporis (Code du travail numérique)","https://code.travail.gouv.fr/glossaire/prorata-temporis",false," Méthode de calcul propre à SimuDroit : aucun texte unique n’impose une méthode, elle dépend de votre contrat ou de votre convention collective. Les jours fériés et les absences ne sont pas pris en compte."],
   "salaire-horaire-mensuel":["salaire mensuel = salaire horaire × durée hebdomadaire × 52 ÷ 12 (151,67 heures par mois à 35 heures) ; annuel = mensuel × 12.","Service-Public.gouv.fr, fiche F1911 (durée du travail)","https://www.service-public.gouv.fr/particuliers/vosdroits/F1911","2026-11-01"," La fiche confirme 35 heures et 151,67 heures par mois ; pour une autre durée, la mensualisation × 52 ÷ 12 est la méthode proportionnelle de SimuDroit. Comparaison au Smic : <a href='https://www.service-public.gouv.fr/particuliers/vosdroits/F2300' target='_blank' rel='noopener noreferrer'>fiche Smic (F2300)</a>."],
   "cpf":["participation obligatoire de 150 € pour un titulaire salarié, plafonds de prise en charge de 1 500 € (certifications du Répertoire spécifique), 1 600 € (bilan de compétences) et 900 € (permis de conduire léger, sous conditions), sans plafond pour le RNCP.","Mon compte formation (site officiel)","https://www.moncompteformation.gouv.fr/espace-public/pourquoi-mes-droits-cpf-sont-ils-plafonnes","2026-11-01"," Participation de 150 € : décret n° 2026-234 du 30 mars 2026, publié au Journal officiel du 1er avril 2026, applicable aux demandes postérieures à son entrée en vigueur, soit à compter du 2 avril 2026 (<a href='https://www.moncompteformation.gouv.fr/espace-public/une-participation-financiere-obligatoire-pour-mobiliser-vos-droits-cpf' target='_blank' rel='noopener noreferrer'>Mon compte formation</a>). Droits acquis : 500 € par an (plafond 5 000 €) ou 800 € (plafond 8 000 €) sans diplôme de niveau 3, proratisés sous un mi-temps (<a href='https://www.moncompteformation.gouv.fr/espace-public/salarie-de-droit-prive' target='_blank' rel='noopener noreferrer'>Mon compte formation</a>). Plafonds confirmés aussi par <a href='https://www.service-public.gouv.fr/particuliers/actualites/A18831' target='_blank' rel='noopener noreferrer'>Service-Public (actualité A18831)</a>. Seul votre compte Mon compte formation fait foi. Les changements annoncés pour les demandes validées à partir du 2 octobre 2026 figurent dans le projet de loi de finances 2027, non adopté : ils ne sont pas appliqués ici."],
   "fin-contrat-fonction-publique":["10 % de la rémunération brute totale pour un contrat de 1 an maximum, renouvellement compris, avec une rémunération moyenne inférieure ou égale à 2 Smic (plafond officiel : 3 734,03 € brut par mois en 2026, proratisé pour un temps partiel) ; versée au plus tard un mois après la fin du contrat (décret n° 2020-1296 du 23 octobre 2020, articles L554-3 et L554-4 du code général de la fonction publique).","Service-Public.gouv.fr, fiche F1606","https://www.service-public.gouv.fr/particuliers/vosdroits/F1606","2026-11-01"," Fiche vérifiée le 1er juin 2026. Le plafond de 3 734,03 € est réduit au prorata de la quotité de travail saisie. Les motifs de recrutement ouvrant droit varient selon la fonction publique : vérifiez avec votre employeur."],
   "impot-revenu":["barème progressif 2026 sur les revenus 2025 (0 % jusqu’à 11 600 €, 11 % jusqu’à 29 579 €, 30 % jusqu’à 84 577 €, 41 % jusqu’à 181 917 €, 45 % au-delà), quotient familial avec plafonnement de l’avantage à 1 807 € par demi-part (4 262 € pour la première demi-part d’un parent isolé), déduction forfaitaire de 10 % entre 509 € et 14 555 € pour les salaires.","Service-Public.gouv.fr, fiche F1419 (barème)","https://www.service-public.gouv.fr/particuliers/vosdroits/F1419","2026-11-01"," Fiche F1419 vérifiée le 15 avril 2026. Déduction de 10 % : <a href='https://www.impots.gouv.fr/particulier/questions/comment-puis-je-beneficier-de-la-deduction-forfaitaire-de-10' target='_blank' rel='noopener noreferrer'>impots.gouv.fr</a>. Décote (897 € ou 1 483 €, 45,25 %, seuils de 1 982 € et 3 277 €) : <a href='https://bofip.impots.gouv.fr/bofip/2495-PGP.html/identifiant=BOI-IR-LIQ-20-20-30-20260407' target='_blank' rel='noopener noreferrer'>BOFiP BOI-IR-LIQ-20-20-30</a>. Estimation avant réductions et crédits d’impôt : votre avis d’impôt fait foi."],
   "salaire-net-apres-impot":["salaire net imposable estimé par la paie SimuDroit, déduction de 10 %, puis barème progressif 2026 sur les revenus 2025 et quotient familial (mêmes paramètres que le simulateur d’impôt sur le revenu).","Service-Public.gouv.fr, fiche F1419 (barème)","https://www.service-public.gouv.fr/particuliers/vosdroits/F1419","2026-11-01"," Le net imposable est une estimation SimuDroit à partir des cotisations usuelles du secteur privé : le montant réel figure sur votre bulletin de paie. Déduction de 10 % : <a href='https://www.impots.gouv.fr/particulier/questions/comment-puis-je-beneficier-de-la-deduction-forfaitaire-de-10' target='_blank' rel='noopener noreferrer'>impots.gouv.fr</a>."],
   "seuils-effectifs-entreprise":["obligations de l’employeur selon l’effectif : CSE à partir de 11 salariés sur 12 mois consécutifs, règlement intérieur à partir de 50, avec des effets sociaux après 5 années consécutives.","Service-Public Entreprendre, F31415 : effectifs de l’entreprise, obligations sociales selon les seuils","https://entreprendre.service-public.gouv.fr/vosdroits/F31415","2026-11-04"," La fiche est une traduction automatique ; la règle de participation pour 11 à 49 salariés y est ambiguë et n’est pas reprise. Votre convention collective peut prévoir davantage."],
   "suivi-arrets-maladie-equipe":["visite de reprise obligatoire après 60 jours d’arrêt pour maladie ou accident non professionnel, 30 jours pour un accident du travail, toujours pour une maladie professionnelle ou un congé de maternité, au plus tard 8 jours après la reprise.","Service-Public, F2871 : visite médicale après un arrêt de travail","https://www.service-public.gouv.fr/particuliers/vosdroits/F2871","2026-11-04"," La fiche F144 cite un seuil de 30 jours pour la maladie, en contradiction avec F2871 : le seuil de 60 jours (fiche la plus récente) est retenu. Le taux d’absentéisme est un repère interne, sans valeur officielle."],
   "planning-roulement-equipe":["limites de durée du travail : 10 heures par jour, 48 heures par semaine, 44 heures en moyenne sur 12 semaines, 11 heures de repos entre deux journées et 35 heures consécutives de repos par semaine.","Service-Public, F1911 : durée du travail d’un salarié du secteur privé à temps plein","https://www.service-public.gouv.fr/particuliers/vosdroits/F1911","2026-11-04"," Le repos quotidien de 11 heures figure sur la fiche F2327. Pauses, congés, travail de nuit, jeunes de moins de 18 ans et conventions collectives ne sont pas modélisés."],
   "suivi-conges-payes-equipe":["congés payés : 2,5 jours ouvrables acquis par mois de travail effectif, 30 jours par an, sur une période de référence du 1er juin au 31 mai en général.","Service-Public, F2258 : congés payés du salarié du secteur privé","https://www.service-public.gouv.fr/particuliers/vosdroits/F2258","2026-11-04"," L’acquisition pendant un arrêt maladie (2 jours par mois, 24 par an) et les règles des temps partiels, CDD et caisses de congés ne sont pas modélisées. Les 25 jours ouvrés correspondent aux 5 semaines de congés à 5 jours par semaine."],
   "calcul-delais-echeances":["délais : le jour de départ n'est pas compté pour un délai en jours; un délai en mois se termine le même quantième; une échéance un samedi, un dimanche ou un férié est reportée au premier jour ouvrable suivant (procédure civile).","Service-Public, F31111 : calcul d'un délai en procédure civile","https://www.service-public.gouv.fr/particuliers/vosdroits/F31111","2026-11-04"," Page en traduction automatique, qui se contredit sur le jour de départ des délais en mois. Les autres matières (travail, impôts, justice administrative) peuvent compter autrement; les allongements outre-mer et à l'étranger ne sont pas modélisés."],
   "duerp-document-unique":["DUERP : obligatoire dès le premier salarié, mis à jour au moins une fois par an à partir de 11 salariés, conservé 40 ans.","Service-Public Entreprendre, F35360 : document unique d'évaluation des risques professionnels","https://entreprendre.service-public.gouv.fr/vosdroits/F35360","2026-11-04"," Fiche en traduction automatique. Le barème fréquence x gravité est une convention de l'outil, la méthode étant libre. Le dépôt dématérialisé n'est pas traité par les sources lues, et les montants des sanctions varient selon les pages officielles."],
   "lettre-litige":["délais de litige : rétractation 14 jours, garantie légale de conformité 2 ans, recours administratif 2 mois, médiateur de la consommation 1 an après la réclamation, restitution du dépôt de garantie 1 ou 2 mois.","Service-Public, F10485 rétractation; F11094 garantie; F2474 recours; F33338 médiation; F31269 dépôt de garantie","https://www.service-public.gouv.fr/particuliers/vosdroits/F10485","2026-11-04"," Les lettres sont des trames du site, non des modèles officiels. Les délais sont calculés sans les jours fériés. Certaines fiches Service-Public sont des traductions automatiques; les cas particuliers (contrats spéciaux, outre-mer) ne sont pas modélisés."],
   "comparer-demission-rupture-licenciement":["indemnité légale de licenciement : 1/4 de mois par année jusqu'à 10 ans puis 1/3, ancienneté minimale 8 mois; la rupture conventionnelle ne peut être inférieure à ce minimum.","Service-Public, indemnité légale de licenciement et rupture conventionnelle (pages liées du site)","https://www.service-public.gouv.fr/particuliers/vosdroits/F987","2026-11-04"," Comparateur de synthèse : il reprend les règles des simulateurs détaillés du site; convention collective, faute grave, préavis et chômage ne sont pas calculés ici."],
   "cout-rupture-conventionnelle-employeur":["rupture conventionnelle : indemnité au moins égale à l'indemnité légale de licenciement; contribution patronale unique de 30 % sur l'indemnité depuis le 1er septembre 2023.","Service-Public (actualité A16711) et Urssaf : rupture conventionnelle","https://entreprendre.service-public.gouv.fr/actualites/A16711","2026-11-05"," L'article A16711 est signalé comme ancien par Service-Public et la page Urssaf consultée ne donne pas le taux : à confirmer avant usage. Cotisations sur part non exonérée, préavis et congés non calculés."],
   "capacite-emprunt":["règle du Haut Conseil de stabilité financière pour les crédits immobiliers : taux d’effort de 35 % des revenus au maximum et durée de 25 ans au plus.","économie.gouv.fr, HCSF : mesure relative à l’octroi de crédits immobiliers","https://www.economie.gouv.fr/hcsf/mesures/mesure-relative-loctroi-de-credits-immobiliers","2026-11-03"," La page ne précise pas si l’assurance est comprise dans le taux d’effort : ce simulateur l’inclut par prudence. Les banques peuvent déroger pour une part limitée de leurs prêts."],
   "saisie-sur-salaire":["barème 2026 de la saisie sur rémunérations : fractions de 1/20 à la totalité par tranche de rémunération nette, seuils relevés de 145 € par personne à charge, solde insaisissable de 651,69 €.","Service-Public, saisie sur salaire : barème 2026","https://www.service-public.gouv.fr/particuliers/actualites/A15377","2026-11-03"," Estimation fondée sur la page Service-Public (traduction automatique consultée) ; la date d\u2019entrée en vigueur n\u2019y est pas précisée. Le commissaire de justice fixe le montant réel."],
   "aide-carburant-grands-rouleurs":["critères de l’aide de 100 € pour les travailleurs « grands rouleurs » : revenu fiscal de référence 2024 par part de 22 770 € au plus, 15 km par trajet ou 8 000 km par an, véhicule thermique ou hybride non rechargeable, demande du 27 octobre au 31 décembre 2026.","impots.gouv.fr, FAQ de l’aide carburant pour les travailleurs grands rouleurs","https://www.impots.gouv.fr/sites/default/files/media/1_metier/1_particulier/simulateurs/2026/ict_aide_grands_rouleurs/faq_aide_carburant_travailleurs_grands_rouleurs.pdf","2026-11-03"," Document non daté, qui cite le décret du 15 octobre 2026. Ce test vous oriente ; le simulateur officiel de impots.gouv.fr fait foi."],
   "frais-kilometriques":["barème kilométrique des frais réels de transport applicable aux revenus 2025, selon le type de véhicule, la puissance fiscale et la distance annuelle, avec majoration de 20 % pour un véhicule 100 % électrique.","impots.gouv.fr, aide du simulateur d’impôt (frais réels)","https://simulateur-ir-ifi.impots.gouv.fr/calcul_impot/2026/aides/frais.htm","2026-11-01"," Les coefficients ont été relus un à un sur cette page. Le barème ne vaut que pour les frais réels déduits de l’impôt sur le revenu ; les indemnités versées par un employeur suivent d’autres règles."],
   "comparer-mon-salaire":["rang du salaire net mensuel en équivalent temps plein parmi les centiles de la distribution des salaires du secteur privé en 2025.","Insee","https://www.insee.fr/fr/statistiques/9087193",false," Centiles et médianes publiés par l’Insee, non relus à cette date. Photo statistique, pas un jugement : l’âge, le métier, le diplôme et la région expliquent une grande partie des écarts."],
   "rupture-assistante-maternelle":["préavis de 8 jours calendaires (moins de 3 mois d’accueil), 15 jours (3 à 12 mois) ou 1 mois (1 an et plus) lorsque l’employeur rompt le contrat ; indemnité de rupture de 1/80 du total des salaires bruts à partir de 9 mois d’accueil.","DREETS Auvergne-Rhône-Alpes, fiche de mars 2024","https://auvergne-rhone-alpes.dreets.gouv.fr/sites/auvergne-rhone-alpes.dreets.gouv.fr/IMG/pdf/assistants_maternels-rupture_cdi_par_employeur-ara-18-03-2024.pdf",false," Fiche datée de mars 2024, non relue à cette date : les règles de votre convention collective et de votre contrat s’appliquent en complément."]
  };
  function add(){
    var r=document.querySelector(".result");if(!r||r.querySelector(".sd-basis"))return;
    var b=B[slug],h='';
    if(b)h+='<strong>Règle appliquée :</strong> '+b[0]+' <strong>Source :</strong> <a href="'+b[2]+'" target="_blank" rel="noopener noreferrer">'+b[1]+'</a>.'+(b[4]||'')+' ';
    /* b[3] : date de relecture réelle de la source (ISO) ; false = source non relue récemment, aucune date de vérification n’est affichée */
    if(b&&b.length>3){if(b[3])h+='Règle relue sur la source le <time datetime="'+b[3]+'">'+new Date(b[3]+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}).replace(/^1 /,"1er ")+'</time> · ';}
    else h+='Barèmes vérifiés le <time datetime="'+VERIF+'">'+VERIF_FR+'</time> · ';
    h+='<a href="/methode-et-sources/">Méthode et sources</a>';
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
    if(location.pathname!=="/"&&location.pathname!=="/index.html")return;
    var K="sd-news-cv-1";try{if(localStorage.getItem(K))return;}catch(e){}
    function go(){
      if(document.getElementById("sd-news"))return;
      var d=document.createElement("div");d.id="sd-news";d.className="sd-news";d.setAttribute("role","region");d.setAttribute("aria-label","Nouveauté");
      d.innerHTML='<a href="/generateur-cv/"><span class="sd-news-thumbs" aria-hidden="true"><img src="/assets/cv-prev-1.webp" alt="" width="26" height="37"><img src="/assets/cv-prev-2.webp" alt="" width="26" height="37"><img src="/assets/cv-prev-3.webp" alt="" width="26" height="37"></span><span class="sd-news-tag">Nouveau</span><span class="sd-news-txt"><strong>Générateur de CV gratuit</strong><span class="sd-news-sub"> : un style unique à chaque CV</span></span><span class="sd-news-go">Créer mon CV</span></a><button type="button" aria-label="Fermer l\'annonce">&times;</button>';
      var h=document.querySelector("header")||document.body.firstChild;
      h.parentNode.insertBefore(d,h);var cs=getComputedStyle(document.body);if(h.parentNode===document.body&&parseFloat(cs.marginTop)>0)d.style.margin="-"+cs.marginTop+" -"+cs.marginRight+" "+cs.marginTop+" -"+cs.marginLeft;
      d.querySelector("button").addEventListener("click",function(){try{localStorage.setItem(K,"1");}catch(e){}d.remove();});
    }
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go();
  }catch(e){}
})();

/* Mobile : les sections des pages « fiche » (guides, aides, métiers) se replient pour éviter les pages interminables */
(function(){
  function go(){
    if(!window.matchMedia||!window.matchMedia("(max-width:640px)").matches)return;
    var art=document.querySelector("main article");
    if(!art||art.querySelector(".gd-grid,#gd-list,form,input,select,textarea,.card,.cards")||art.hasAttribute("data-nofold"))return;
    if(art.querySelectorAll(":scope>h2").length<3)return;
    var kids=Array.prototype.slice.call(art.children),groups=[],cur=null;
    kids.forEach(function(k){
      if(k.tagName==="H2"){cur={h:k,body:[]};groups.push(cur);}
      else if(cur&&k.tagName!=="SCRIPT"&&k.tagName!=="STYLE"&&!k.matches("nav,.sd-next,.sd-see,section.sd-next,section.sd-see"))cur.body.push(k);
      else if(cur&&(k.matches("nav,.sd-next,.sd-see")))cur=null;
    });
    var hash=location.hash?document.getElementById(location.hash.slice(1)):null,first=true;
    groups.forEach(function(g){
      if(!g.body.length||g.h.closest("details"))return;
      var d=document.createElement("details"),s=document.createElement("summary"),b=document.createElement("div");
      d.className="sd-m-fold";b.className="sd-m-body";
      g.h.parentNode.insertBefore(d,g.h);s.appendChild(g.h);d.appendChild(s);g.body.forEach(function(n){b.appendChild(n);});d.appendChild(b);
      if(first){d.open=true;first=false;}
      if(hash&&(d.contains(hash)))d.open=true;
    });
    window.addEventListener("beforeprint",function(){Array.prototype.forEach.call(document.querySelectorAll("details.sd-m-fold"),function(x){x.open=true;});});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go();
})();

/* Mobile : sur les simulateurs, l'outil reste visible et les textes d'explication qui le suivent se replient */
(function(){
  function go(){
    if(!window.matchMedia||!window.matchMedia("(max-width:640px)").matches)return;
    var calc=document.querySelector("main section.calculator");
    if(!calc||calc.hasAttribute("data-nofold"))return;
    var n=calc.nextElementSibling,list=[];
    while(n){if(n.tagName==="SECTION"&&n.classList.contains("info-section")&&!n.classList.contains("sd-fold")&&n.querySelector(":scope>h2"))list.push(n);n=n.nextElementSibling;}
    list.forEach(function(s){
      var h=s.querySelector(":scope>h2"),d=document.createElement("details"),sm=document.createElement("summary"),b=document.createElement("div");
      d.className="sd-m-fold";b.className="sd-m-body";
      s.parentNode.insertBefore(d,s);sm.appendChild(h);d.appendChild(sm);
      while(s.firstChild)b.appendChild(s.firstChild);d.appendChild(b);s.remove();
      if(s.classList.contains("sd-know"))d.open=true;
      var id=s.id;if(id){d.id=id;if(location.hash==="#"+id)d.open=true;}
    });
    window.addEventListener("beforeprint",function(){Array.prototype.forEach.call(document.querySelectorAll("details.sd-m-fold"),function(x){x.open=true;});});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go();
})();

/* Mobile : page des aides, chaque rubrique devient un accordéon */
(function(){
  function go(){
    if(!window.matchMedia||!window.matchMedia("(max-width:640px)").matches)return;
    var secs=Array.prototype.slice.call(document.querySelectorAll("article .ad-sec"));
    secs.forEach(function(s,i){
      var h=s.querySelector(":scope>h2");if(!h||s.closest("details"))return;
      var d=document.createElement("details"),sm=document.createElement("summary"),b=document.createElement("div");
      d.className="sd-m-fold";b.className="sd-m-body";d.id=s.id;
      if(s.getAttribute("style"))d.setAttribute("style",s.getAttribute("style"));
      s.parentNode.insertBefore(d,s);sm.appendChild(h);d.appendChild(sm);
      while(s.firstChild)b.appendChild(s.firstChild);d.appendChild(b);s.remove();
      if(i===0||location.hash==="#"+d.id)d.open=true;
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go();
})();

/* Mobile : barre « Suite » fixe avec le prochain clic pertinent (apparaît après un peu de lecture, fermable) */
(function(){
  function go(){
    if(!window.matchMedia||!window.matchMedia("(max-width:640px)").matches)return;
    if(location.pathname==="/"||document.getElementById("sd-suite"))return;
    try{if(sessionStorage.getItem("sd-suite-x")==="1")return;}catch(e){}
    var a=document.querySelector("main .sd-next-list li:not(.here) a")||document.querySelector("main .rel-links a")||document.querySelector("main .sd-see-grid a");
    if(!a)return;
    var s=a.querySelector("strong"),label=((s&&s.textContent)||a.textContent||"").replace(/\s+/g," ").trim();
    if(!label||label.length>60)return;
    var bar=document.createElement("div");bar.id="sd-suite";bar.setAttribute("role","complementary");bar.setAttribute("aria-label","Suite de la lecture");bar.hidden=true;
    var l=document.createElement("a");l.href=a.getAttribute("href");l.innerHTML='<small>Suite</small><span></span>';l.querySelector("span").textContent=label;
    var x=document.createElement("button");x.type="button";x.setAttribute("aria-label","Fermer la suggestion");x.textContent="×";
    bar.appendChild(l);bar.appendChild(x);document.body.appendChild(bar);
    x.addEventListener("click",function(){bar.hidden=true;document.body.classList.remove("sd-has-bar");try{sessionStorage.setItem("sd-suite-x","1");}catch(e){}});
    var shown=false;
    function chk(){if(bar.dataset.closed)return;var y=window.scrollY||0,h=document.documentElement.scrollHeight-window.innerHeight;var on=y>400&&y<h-200;
      try{if(sessionStorage.getItem("sd-suite-x")==="1")on=false;}catch(e){}
      if(on!==shown){shown=on;bar.hidden=!on;document.body.classList.toggle("sd-has-bar",on);}}
    window.addEventListener("scroll",chk,{passive:true});chk();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go();
})();

/* Tableaux : étiquette de colonne sur chaque cellule (lecture mobile) */
(function(){function go(){try{[].forEach.call(document.querySelectorAll("table.sd-table"),function(t){var h=[].map.call(t.querySelectorAll("thead th"),function(x){return x.textContent.trim()});if(!h.length)return;[].forEach.call(t.querySelectorAll("tbody tr"),function(r){[].forEach.call(r.children,function(c,i){if(i>0&&c.tagName==="TD"&&!c.hasAttribute("data-label")&&h[i])c.setAttribute("data-label",h[i])})})})}catch(e){}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go()})();

/* L'outil d'abord : bloc « À savoir » replié, parcours sous l'outil */
(function(){function go(){try{var c=document.querySelector("main>section.calculator");if(!c)return;document.body.classList.add("sd-tool");
var n=[].filter.call(c.querySelectorAll(":scope>div.intro-note"),function(e){return !e.id&&/^\s*À savoir/.test(e.textContent)})[0];if(n&&!n.closest("details")){var d=document.createElement("details");d.className="sd-savoir";var s=document.createElement("summary");s.textContent="À savoir avant de calculer";d.appendChild(s);n.parentNode.insertBefore(d,n);n.className="";d.appendChild(n)}
var l=document.querySelector("main>nav.sd-line");if(l&&c.nextSibling)c.parentNode.insertBefore(l,c.nextSibling)}catch(e){}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go()})();
