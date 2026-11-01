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
    "simulateur-frais-kilometriques": "frais kilometriques bareme kilometrique indemnites kilometriques frais reels deduction voiture moto electrique trajet domicile travail impot",
    "journee-de-solidarite-2027-date-regles-remuneration": "journee de solidarite 2027 lundi de pentecote 7 heures non remuneree temps partiel jour ferie travaille",
    "guides/convention-de-stage-regles-duree-gratification-droits-du-stagiaire": "convention de stage duree maximale 6 mois gratification obligatoire droits du stagiaire tuteur delai de carence",
    "guides/contrat-d-apprentissage-conditions-demarches-droits-de-l-apprenti": "contrat d apprentissage alternance apprenti age 16 29 ans duree rupture 45 jours opco cfa conges",
    "guides/rapport-de-stage-comment-le-rediger-etape-par-etape": "rapport de stage plan redaction comment faire un rapport de stage introduction conclusion annexes sommaire",
    "generateur-page-de-garde-rapport-de-stage": "page de garde rapport de stage logo entreprise generateur pdf word modele page de garde memoire",
    "guides/devenir-chauffeur-routier-permis-c-ce-fimo-fco-formations": "chauffeur routier conducteur routier poids lourd permis c permis ce fimo fco formation transport marchandises camion",
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
