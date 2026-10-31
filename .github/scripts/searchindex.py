#!/usr/bin/env python3
"""Génère assets/search-index.json (moteur de recherche de l'accueil) à partir de toutes les pages du site.
Usage : python3 .github/scripts/searchindex.py [--check]"""
import glob, html, json, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
# mots que les visiteurs tapent et qui ne figurent pas forcément dans le titre
SYN = {
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
    if path == "generateur-cv": return "Outil"
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
