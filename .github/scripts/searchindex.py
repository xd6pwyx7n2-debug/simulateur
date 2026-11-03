#!/usr/bin/env python3
"""Génère assets/search-index.json (moteur de recherche de l'accueil) à partir de toutes les pages du site.
Usage : python3 .github/scripts/searchindex.py [--check]"""
import glob, html, json, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
# mots que les visiteurs tapent et qui ne figurent pas forcément dans le titre
SYN = {
    "faire-le-point-reconversion": "reconversion professionnelle bilan de competences orientation changer de metier projet professionnel cep pistes plan d action",
    "ouvrir-un-salon-de-coiffure-demarches-etape-par-etape": "coiffeur coiffure salon ouvrir un salon de coiffure cap bp qualification affichage prix",
    "ouvrir-un-food-truck-demarches-etape-par-etape": "food truck camion restauration ambulante commerçant ambulant ouvrir un food truck hygiene",
    "ouvrir-un-bar-cafe-licence-permis-exploitation-demarches": "bar cafe licence 3 licence 4 permis exploitation debit de boissons terrasse ouvrir un bar",
    "ouvrir-une-epicerie-demarches-etape-par-etape": "epicerie epicerie fine commerce alimentaire superette ouvrir une epicerie ddpp declaration sanitaire",
    "simulateur-saisie-sur-salaire": "saisie sur salaire saisie des remunerations bareme 2026 quotite saisissable reste a vivre solde insaisissable 651,69 pension alimentaire dette commissaire de justice huissier simulateur",
    "simulateur-aide-carburant-grands-rouleurs": "aide carburant grands rouleurs prime carburant 2026 simulateur 100 euros eligibilite travailleurs 22770 revenu fiscal de reference formulaire 31 decembre",
    "simulateur-frais-kilometriques": "frais kilometriques bareme kilometrique indemnites kilometriques frais reels deduction voiture moto electrique trajet domicile travail impot",
    "journee-de-solidarite-2027-date-regles-remuneration": "journee de solidarite 2027 lundi de pentecote 7 heures non remuneree temps partiel jour ferie travaille",
    "guides/convention-de-stage-regles-duree-gratification-droits-du-stagiaire": "convention de stage duree maximale 6 mois gratification obligatoire droits du stagiaire tuteur delai de carence",
    "guides/contrat-d-apprentissage-conditions-demarches-droits-de-l-apprenti": "contrat d apprentissage alternance apprenti age 16 29 ans duree rupture 45 jours opco cfa conges",
    "guides/rapport-de-stage-comment-le-rediger-etape-par-etape": "rapport de stage plan redaction comment faire un rapport de stage introduction conclusion annexes sommaire",
    "generateur-page-de-garde-rapport-de-stage": "page de garde rapport de stage logo entreprise generateur pdf word modele page de garde memoire",
    "guides/devenir-chauffeur-routier-permis-c-ce-fimo-fco-formations": "chauffeur routier conducteur routier poids lourd permis c permis ce fimo fco formation transport marchandises camion",
    "guides/prime-d-activite-2026-conditions-calcul-montant-demande": "prime d activite 2026 caf montant forfait 638 conditions calcul bonification demande trimestrielle",
    "guides/apl-aide-au-logement-2026-conditions-loyers-plafonds-demande": "apl aide personnalisee au logement caf loyer plafond zone conditions demande logement conventionne gel budget 2027",
    "guides/budget-2027-ce-qui-est-propose-et-ce-qui-est-vote": "budget 2027 projet de loi de finances plf retraites abattement 10 pour cent apl heures supplementaires indemnites journalieres vote assemblee 49",
    "documents-a-generer": "documents a generer generateur gratuit cv devis facture quittance attestation contrat page de garde pdf word",
    "generateur-contrat-emploi-a-domicile": "contrat de travail emploi a domicile femme de menage aide a domicile cesu cdi cdd periode d'essai modele gratuit pdf word",
    "guides/point-d-indice-fonction-publique-calcul-traitement-indiciaire": "point d indice fonction publique 2026 valeur 4,92 indice majore traitement indiciaire brut calcul fonctionnaire salaire indice 366",
    "guides/charges-infirmier-liberal-cotisations-rattrapage-combien-mettre-de-cote": "infirmier liberal idel charges cotisations urssaf carpimko rattrapage regularisation mettre de cote 50 pourcent provision impot installation debut activite",
    "guides/s-installer-infirmier-liberal-etapes-statuts-demarches": "installer infirmier liberal idel demarches ordre infirmiers cpam rpps cps assurance rcp declaration activite 24 mois 3200 heures zone sur dotee statut remplacant",
    "guides/plafond-securite-sociale-2027-montants-ce-qui-change": "plafond securite sociale 2027 pass pmss 48900 4075 mensuel annuel boss",
    "guides/smic-2027-revalorisation-1er-janvier-ce-que-lon-sait": "smic 2027 revalorisation 1er janvier augmentation smic horaire mensuel",
    "guides/ce-qui-change-au-1er-janvier-2027-les-chiffres": "ce qui change 1er janvier 2027 plafond smic budget cpf nouveautes",
    "guides/conge-paternite-2026-duree-jours-demarches-tous-secteurs": "conge paternite 2026 25 jours 32 jours naissance demarches prevenir employeur fractionner fonctionnaire independant protection licenciement",
    "guides/naissance-bebe-demarches-aides-conges-dans-l-ordre": "naissance bebe demarches declaration de naissance 5 jours mairie caf paje prime naissance cmg preparE conge parental impots vitale mutuelle",
    "guides/sortir-du-surendettement-plan-d-action-positif": "surendettement sortir du surendettement banque de france commission dossier plan effacement dettes retablissement personnel ficp 7 ans dettes aide",
    "guides/concours-fonction-publique-types-conditions-inscription-calendrier": "concours fonction publique externe interne troisieme concours cnal talents inscription calendrier limite age diplome equivalence liste complementaire pacte sans concours",
    "guides/comment-devenir-fonctionnaire-concours-conditions-categories": "comment devenir fonctionnaire concours externe interne troisieme concours categorie a b c sans concours pacte titularisation fonction publique etat territoriale hospitaliere",
    "guides/comment-devenir-assistante-maternelle-agrement-formation-demarches": "comment devenir assistante maternelle assistant maternel agrement pmi formation 120 heures departement 3 mois enfants accueillis mam monenfant",
    "guides/prime-de-noel-2026-montants-date-de-versement-qui-y-a-droit": "prime de noel 2026 montant date versement rsa ass aer caf france travail 152,45 16 decembre allocataires",
    "guides/comment-devenir-auto-entrepreneur-micro-entrepreneur-etapes": "comment devenir auto entrepreneur micro entrepreneur creer micro entreprise etapes declaration acre versement liberatoire plafond 83 600 203 100 immatriculation guichet",
    "guides/parcoursup-2027-calendrier-dates-cles-et-ce-qui-peut-changer": "parcoursup 2027 calendrier dates voeux 17 decembre 18 janvier 11 mars 1er avril 1er juin phase complementaire inscription etudes superieur bachelier terminale",
    "guides/metiers-sans-diplome-au-dessus-du-smic-acces-et-salaires": "metiers sans diplome bien remuneres salaire au dessus du smic conducteur routier bus metro train agent de securite cariste taxi onisep formation courte",
    "mon-plan-de-sortie-surendettement": "plan de sortie surendettement parcours accompagne agenda rappels releve de compte analyse depenses budget csv",
    "guides/frais-kilometriques-bareme-2026-deduire-trajet-domicile-travail": "frais kilometriques bareme kilometrique 2026 deduire trajet domicile travail frais reels 10 pourcent 40 km voiture electrique impot",
    "guides/cesu-embaucher-aide-a-domicile-menage-demarches-contrat-credit-impot": "cesu embaucher femme de menage aide a domicile particulier employeur declaration urssaf credit d'impot 50 pourcent salaire contrat",
    "generateur-attestation-d-hebergement": "attestation hebergement generateur modele attestation sur l'honneur heberge hebergeant pdf word gratuit",
    "guides/attestation-d-hebergement-comment-la-rediger-pieces-a-fournir": "attestation hebergement pieces a fournir justificatif de domicile heberge chez un tiers carte identite passeport",
    "generateur-quittance-de-loyer": "quittance de loyer generateur modele quittance proprietaire locataire pdf word gratuit",
    "guides/quittance-de-loyer-obligation-mentions-paiement-partiel": "quittance de loyer obligation gratuite mentions loyer charges paiement partiel recu bailleur locataire",
    "generateur-facture": "facture modele facture generateur de facture creer une facture pdf word auto entrepreneur micro entrepreneur mentions",
    "guides/facture-mentions-obligatoires-penalites-franchise-tva": "facture mentions obligatoires penalites de retard indemnite 40 euros franchise tva 293 b facturation electronique 2026 2027",
    "generateur-devis": "devis modele devis facture artisan micro entrepreneur creer un devis pdf word",
    "guides/faire-un-devis-mentions-obligatoires-selon-le-metier": "devis modele devis mentions obligatoires artisan batiment acompte arrhes facture",
    "guides/creer-un-business-plan-etapes-financement-seuil-rentabilite": "business plan previsionnel plan de financement seuil de rentabilite creer entreprise banque pret",
    "guides/creer-un-profil-linkedin-professionnel-etape-par-etape": "linkedin compte profil reseau professionnel recherche emploi inscription",
    "guides/ouvrir-une-boulangerie-demarches-etape-par-etape": "boulangerie boulanger pain patisserie ouvrir commerce alimentaire",
    "guides/ouvrir-un-salon-de-tatouage-demarches-etape-par-etape": "tatouage tatoueur salon piercing ars hygiene ouvrir",
    "nouveautes": "nouveautes actualites quoi de neuf rss",
    "guides/acre-cfe-creation-entreprise-demande-exoneration": "acre cfe creer entreprise micro exoneration cotisations impot",
    "guides/frais-de-notaire-achat-immobilier-composition-calcul": "notaire achat immobilier frais emoluments droits de mutation acheter maison appartement",
    "ouvrir-un-commerce": "creer boutique magasin restaurant commerce ouverture demarches creation entreprise",
    "guides/ouvrir-un-restaurant-demarches-etape-par-etape": "restaurant licence permis exploitation hygiene debit boissons ouverture",
    "guides/ouvrir-une-boutique-demarches-etape-par-etape": "boutique magasin commerce local ouverture",
    "guides/bail-commercial-points-a-verifier-avant-de-signer": "bail commercial 3 6 9 loyer local depot garantie derogatoire",
 "generateur-cv": "cv curriculum vitae candidature emploi créer faire mon cv modèle cv",
 "modeles-de-lettres": "lettre courrier modèle type démission rupture réclamation",
 "modele-lettre-motivation-domaine": "lettre de motivation candidature",
 "simulateur-brut-net": "salaire net brut combien je gagne fiche de paie",
 "simulateur-net-brut": "salaire brut net demander augmentation",
 "simulateur-chomage": "are france travail pôle emploi allocation chômage",
 "simulateur-indemnite-licenciement": "licencié indemnité licenciement",
 "simulateur-rupture-conventionnelle": "rupco rupture conventionnelle indemnité",
 "simulateur-preavis-demission": "démission préavis combien de temps",
 "simulateur-conges-payes": "congés payés cp vacances jours",
 "simulateur-smic": "smic salaire minimum",
 "simulateur-point-indice": "fonctionnaire traitement indice majoré fonction publique",
 "simulateur-anciennete": "date entrée ancienneté durée dans l'entreprise",
 "simulateur-cpf": "formation compte personnel de formation droits cpf",
 "simulateur-age-depart-retraite": "retraite âge départ taux plein",
 "simulateur-micro-entrepreneur": "auto-entrepreneur micro entreprise cotisations urssaf",
 "simulateur-arret-maladie-infirmier-liberal": "idel infirmier libéral arrêt maladie carpimko",
 "aides": "aides prime caf apl rsa prime d'activité droits sociaux",
 "metiers/aesh-accompagnant-eleves-handicap": "aesh accompagnant enfants handicap éducation nationale fonctionnaire",
}
def typ(path):
    if path.startswith("simulateur-") or path == "simulateurs": return "Simulateur"
    if path.startswith("guides/") and path != "guides": return "Guide"
    if path.startswith("modele-lettre") or path == "modeles-de-lettres": return "Lettre"
    if path == "generateur-cv" or path.startswith("generateur-"): return "Outil"
    if path.startswith("aides/"): return "Aide"
    if path.startswith("metiers/"): return "Métier"
    if path.startswith("fiches-revision/"): return "Fiche"
    if path.startswith("salaire") or path.startswith("exemples-"): return "Chiffres"
    return "Page"
def build():
    out = []
    for f in sorted(glob.glob(os.path.join(ROOT, "**/index.html"), recursive=True)):
        rel = os.path.relpath(f, ROOT)
        if rel.startswith(("tests/", "assets/", "node_modules/")) or rel == "index.html": continue
        s = open(f, encoding="utf-8").read()
        if re.search(r'name="robots" content="[^"]*noindex', s): continue
        t = re.search(r'<meta property="og:title" content="([^"]*)"', s) or re.search(r"<title>([^<]*)</title>", s)
        d = re.search(r'<meta name="description" content="([^"]*)"', s)
        if not t: continue
        title = re.sub(r"\s*\|\s*SimuDroit\s*$", "", html.unescape(t.group(1)))
        path = os.path.dirname(rel)
        desc = html.unescape(d.group(1)) if d else ""
        out.append([title, desc[:150], "/" + path + "/", typ(path), SYN.get(path, "")])
    return out
def main():
    data = json.dumps(build(), ensure_ascii=False, separators=(",", ":"))
    p = os.path.join(ROOT, "assets", "search-index.json")
    cur = open(p, encoding="utf-8").read() if os.path.exists(p) else ""
    if "--check" in sys.argv:
        print("à jour" if cur == data else "obsolète"); sys.exit(0 if cur == data else 1)
    open(p, "w", encoding="utf-8").write(data); print(len(json.loads(data)), "pages indexées")
main()
