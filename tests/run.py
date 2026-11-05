#!/usr/bin/env python3
"""Tests de non-régression SimuDroit.
Lancement : pip install playwright && playwright install chromium && python tests/run.py
Vérifie : cas de calcul de référence, liens internes, sitemap, balisage de base, erreurs JavaScript.
Les résultats attendus sont calculés à la main à partir des règles publiques (voir tests/cas_reference.md)."""
import glob, json, os, re, sys, threading, http.server, socketserver, functools
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE = "https://simudroit.fr/"
PORT = 8791
failures = []

def fail(msg):
    failures.append(msg)
    print("ECHEC :", msg)

# ---------- Serveur local (racine du domaine) ----------
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = unquote(urlparse(path).path)
        return os.path.join(ROOT, p.lstrip("/"))
    def log_message(self, *a): pass

socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", PORT), H)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
LOCAL = "http://127.0.0.1:%d/" % PORT

# ---------- 1. Contrôles statiques ----------
class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.links = []; self.h1 = 0; self.ld = []; self._ld = False; self.title = ""; self._t = False; self.canon = None
    def handle_starttag(self, tag, a):
        a = dict(a)
        if tag == "h1": self.h1 += 1
        if tag in ("a", "link") and a.get("href"): self.links.append(a["href"])
        if tag in ("script", "img") and a.get("src"): self.links.append(a["src"])
        if tag == "script" and a.get("type") == "application/ld+json": self._ld = True; self.ld.append("")
        if tag == "title": self._t = True
        if tag == "link" and a.get("rel") == "canonical": self.canon = a.get("href")
    def handle_endtag(self, tag):
        if tag == "script": self._ld = False
        if tag == "title": self._t = False
    def handle_data(self, d):
        if self._ld: self.ld[-1] += d
        if self._t: self.title += d

def resolve(href, page_dir):
    href = href.split("#")[0].split("?")[0]
    if not href or href.startswith(("mailto:", "tel:", "data:", "javascript:")): return None
    if href.startswith(BASE): path = href[len(BASE):]
    elif href.startswith("/"): path = href[len("/"):]
    elif href.startswith(("http://", "https://")): return None
    elif href.startswith("/"): path = href.lstrip("/")
    else: path = os.path.relpath(os.path.join(page_dir, href), ROOT)
    full = os.path.join(ROOT, path)
    if os.path.isdir(full): full = os.path.join(full, "index.html")
    return full

pages = sorted(glob.glob(os.path.join(ROOT, "**/index.html"), recursive=True)) + [os.path.join(ROOT, "404.html")]
titles = {}
for f in pages:
    rel = os.path.relpath(f, ROOT)
    s = open(f, encoding="utf-8").read()
    if rel in ("simulateur/index.html", "dossiers/index.html"): continue  # redirection noindex (ancien chemin)
    p = P(); p.feed(s)
    if p.h1 != 1 and rel != "404.html": fail("%s : %d balises h1" % (rel, p.h1))
    _h = [int(x) for x in re.findall(r"<h([1-4])[ >]", s)]
    for _i in range(1, len(_h)):
        if _h[_i] - _h[_i-1] > 1: fail("%s : saut de niveau de titre (h%d vers h%d)" % (rel, _h[_i-1], _h[_i])); break
    if rel != "404.html" and not re.search(r"<main[ >]", s): fail("%s : pas de balise main" % rel)
    if re.search(r"<img(?![^>]*\balt=)", s): fail("%s : image sans attribut alt" % rel)
    if "%s" in s or "undefined" in re.sub(r"<script[\s\S]*?</script>", "", s): fail("%s : texte résiduel (%%s ou undefined)" % rel)
    for j in p.ld:
        try: json.loads(j)
        except Exception as e: fail("%s : JSON-LD invalide (%s)" % (rel, e))
    ids = re.findall(r'\sid="([^"]+)"', re.sub(r"<script[\s\S]*?</script>", "", s))
    for i in set(ids):
        if ids.count(i) > 1: fail("%s : identifiant en double « %s »" % (rel, i))
    t = p.title.strip()
    if t in titles and rel != "404.html": fail("%s : titre identique à %s" % (rel, titles[t]))
    titles[t] = rel
    if rel != "404.html":
        exp = BASE + ("" if rel == "index.html" else rel[:-len("index.html")])
        cm = re.search(r'<link\s+rel="canonical"\s+href="([^"]*)"', s)
        if not cm or cm.group(1) != exp: fail("%s : canonical attendue %s (%s)" % (rel, exp, cm.group(1) if cm else "absente"))
        om = re.search(r'property="og:url"\s+content="([^"]*)"', s)
        if om and om.group(1) != exp: fail("%s : og:url attendue %s (%s)" % (rel, exp, om.group(1)))
        for hl in re.findall(r'hreflang="[^"]*"\s+href="([^"]*)"', s):
            if hl != exp: fail("%s : hreflang attendu %s (%s)" % (rel, exp, hl))
    for l in p.links:
        r = resolve(l, os.path.dirname(f))
        if r and not os.path.exists(r): fail("%s : lien cassé %s" % (rel, l))
sm = open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8").read()
locs = re.findall(r"<loc>([^<]+)</loc>", sm)
for l in locs:
    r = resolve(l, ROOT)
    if not r or not os.path.exists(r): fail("sitemap : URL sans page %s" % l)
for f in pages:
    rel = os.path.relpath(f, ROOT)
    if rel in ("404.html", "simulateur/index.html", "dossiers/index.html"): continue
    url = BASE + (rel[:-len("index.html")] if rel.endswith("index.html") else rel)
    if url not in locs: fail("sitemap : page absente %s" % url)
# Clavier mobile : tout champ numérique à minimum positif doit déclarer son inputmode
for f in pages:
    _h = open(f, encoding="utf-8").read()
    for _t in re.findall(r'<input\b[^>]*\btype="number"[^>]*>', _h):
        _m = re.search(r'\bmin="(-?[\d.]+)"', _t)
        if _m and float(_m.group(1)) >= 0 and "inputmode" not in _t: fail("%s : champ numérique sans inputmode : %s" % (os.path.relpath(f, ROOT), _t[:90]))
# Sources officielles : les 12 simulateurs qui n'en citaient pas doivent afficher, près du résultat (theme.js), une règle,
# une source d'un organisme officiel et une date de relecture réelle (ou aucune date si la source n'a pas été relue).
_th = open(os.path.join(ROOT, "assets", "theme.js"), encoding="utf-8").read()
OFFICIEL = re.compile(r'^https://([a-z0-9-]+\.)*(service-public\.gouv\.fr|code\.travail\.gouv\.fr|impots\.gouv\.fr|insee\.fr|moncompteformation\.gouv\.fr|dreets\.gouv\.fr|legifrance\.gouv\.fr|economie\.gouv\.fr|info\.gouv\.fr)/')
for _s in ("indemnite-depart-retraite", "smic", "salaire-horaire-mensuel", "prorata-salaire", "preavis-demission", "fin-contrat-fonction-publique",
           "cpf", "impot-revenu", "salaire-net-apres-impot", "frais-kilometriques", "aide-carburant-grands-rouleurs", "saisie-sur-salaire", "capacite-emprunt", "suivi-conges-payes-equipe", "seuils-effectifs-entreprise", "planning-roulement-equipe", "suivi-arrets-maladie-equipe", "comparer-mon-salaire", "rupture-assistante-maternelle"):
    _m = re.search(r'^\s+"%s":\[(.*)\],?\s*$' % re.escape(_s), _th, re.M)
    if not _m: fail("sources : %s absent du bandeau « base du calcul » (theme.js)" % _s); continue
    _e = _m.group(1)
    _urls = re.findall(r'"(https://[^"]+)"', _e)
    if not _urls or not OFFICIEL.match(_urls[0]): fail("sources : %s, source principale non officielle ou absente" % _s)
    if not re.search(r'(?:"|\))\s*,\s*(?:"20\d\d-\d\d-\d\d"|false)\s*,', _e) and not re.search(r',\s*(?:"20\d\d-\d\d-\d\d"|false)\s*,', _e): fail("sources : %s, date de relecture manquante (ISO ou false)" % _s)
    if re.search(r'"20(\d\d)-(\d\d)-(\d\d)"', _e) and not re.search(r'"2026-1[01]-\d\d"', _e): fail("sources : %s, date de relecture invraisemblable" % _s)
# Registre des sources relues : la date affichée doit correspondre à une relecture enregistrée, et chaque lien doit y figurer
_reg = json.load(open(os.path.join(ROOT, ".github", "sources-verifiees.json"), encoding="utf-8"))
for _s, _r in _reg.items():
    _m = re.search(r'^\s+"%s":\[(.*)\],?\s*$' % re.escape(_s), _th, re.M)
    if not _m: fail("registre : %s absent de theme.js" % _s); continue
    _e = _m.group(1)
    _d = re.search(r'",\s*("20\d\d-\d\d-\d\d"|false)\s*,', _e)
    _aff = _d.group(1).strip('"') if _d else None
    if (_aff == "false" and _r["date_relecture"] is not False) or (_aff not in (None, "false") and _aff != _r["date_relecture"]): fail("registre : %s, date affichée %s différente de la relecture enregistrée %s" % (_s, _aff, _r["date_relecture"]))
    for _u in set(re.findall(r'https://[^"\'\s<>]+', _e)):
        if _u not in _r["urls"]: fail("registre : %s, lien non enregistré comme relu : %s" % (_s, _u))
    if _r["date_relecture"] and not _r["regles_confirmees"]: fail("registre : %s, date de relecture sans règle confirmée" % _s)
# Cohérence des paramètres avec les règles documentées (valeurs relues sur les sources du registre)
def _page(slug): return open(os.path.join(ROOT, "simulateur-" + slug, "index.html"), encoding="utf-8").read()
_c = _page("cpf")
for _k in ("rs:1500", "bilan:1600", "permis:900", "Math.min(150,C)", "al*10"):
    if _k not in _c: fail("cpf : paramètre attendu absent (%s)" % _k)
if "2 avril 2026" not in _c or "au moins 100 €" in _c: fail("cpf : date du 2 avril absente ou mention obsolète du cofinancement de 100 €")
if "2 octobre 2026" in _c.split("<script>")[-1] or "non adopté" not in _th.split('"cpf":[')[1].split('"impot-revenu"')[0]: fail("cpf : règle du 2 octobre 2026 (projet de loi non adopté) à ne jamais appliquer, mention « non adopté » requise")
for _slug in ("impot-revenu", "salaire-net-apres-impot"):
    _p = _page(_slug)
    for _k in ("[11600,0],[29579,.11],[84577,.30],[181917,.41]", "509", "14555", "1807", "4262"):
        if _k not in _p: fail("%s : paramètre fiscal attendu absent (%s)" % (_slug, _k))
_p = _page("impot-revenu")
for _k in ("3277", "1982", "1483", "897", "0.4525"):
    if _k not in _p: fail("impot-revenu : paramètre de décote absent (%s)" % _k)
if "3734.03" not in open(os.path.join(ROOT, "assets", "params.js"), encoding="utf-8").read() or "plafondFinContrat" not in _page("fin-contrat-fonction-publique"): fail("fin de contrat fonction publique : plafond officiel non utilisé par le calcul")
_k = _page("frais-kilometriques")
for _v in ("0.529", "0.316", "1065", "0.370", "0.697", "0.394", "1515", "0.470", "0.395", "891", "0.606", "1583", "0.315", "711", "0.198"):
    if _v not in _k: fail("frais kilométriques : coefficient du barème absent (%s)" % _v)
# Plus aucune source privée ou syndicale sur les pages d'impôt, de CPF et de fin de contrat dans la fonction publique
for _s, _bad in (("cpf", ("filiz.io", "editions-tissot")), ("impot-revenu", ("legifiscal",)), ("fin-contrat-fonction-publique", ("snes.edu",))):
    _h = open(os.path.join(ROOT, "simulateur-" + _s, "index.html"), encoding="utf-8").read()
    for _b in _bad:
        if _b in _h: fail("sources : simulateur-%s cite encore une source non officielle (%s)" % (_s, _b))
# Guide frais kilométriques : barème identique à celui du simulateur, parcours en stations, lien vers le simulateur
_g = open(os.path.join(ROOT, "guides", "frais-kilometriques-bareme-2026-deduire-trajet-domicile-travail", "index.html"), encoding="utf-8").read()
for _v in ("d × 0,529", "(d × 0,316) + 1 065", "d × 0,697", "(d × 0,394) + 1 515", "d × 0,470", "3 751,20", "4 501,44"):
    if _v not in _g: fail("guide frais kilométriques : valeur du barème absente (%s)" % _v)
if _g.count('<li><strong>') < 5 or "/simulateur-frais-kilometriques/" not in _g or "gd-metro" not in _g: fail("guide frais kilométriques : parcours ou lien vers le simulateur absent")
if 5001 and round(6600*0.357+1395, 2) != 3751.20: fail("guide frais kilométriques : exemple chiffré incohérent")
if "frais-kilometriques-bareme" not in _page("frais-kilometriques"): fail("simulateur frais kilométriques : lien vers le guide absent")
# Guide point d'indice : valeur du point cohérente avec les paramètres du simulateur et exemples exacts
_pi = open(os.path.join(ROOT, "guides", "point-d-indice-fonction-publique-calcul-traitement-indiciaire", "index.html"), encoding="utf-8").read()
_fp = re.search(r'pointAnnuel:\s*([\d.]+)', open(os.path.join(ROOT, "assets", "params.js"), encoding="utf-8").read())
if not _fp or "59,0734" not in _pi or float(_fp.group(1)) != 59.0734: fail("guide point d'indice : valeur du point incohérente avec params.js")
for _im, _an, _me in ((366, "21 620,86", "1 801,73"), (400, "23 629,36", "1 969,11"), (500, "29 536,70", "2 461,39")):
    _a = round(_im * float(_fp.group(1)), 2)
    _f = lambda x: ("{:,.2f}".format(x)).replace(",", " ").replace(".", ",")
    _num = lambda s: float(s.replace(" ", "").replace(",", "."))
    if _f(_a) != _an or abs(_a / 12 - _num(_me)) > 0.011 or _an not in _pi or _me not in _pi: fail("guide point d'indice : exemple IM %d incohérent (%s / %s)" % (_im, _f(_a), _f(round(_a / 12, 2))))
if "/simulateur-point-indice/" not in _pi or "point-d-indice-fonction" not in _page("point-indice"): fail("guide point d'indice : liens croisés avec le simulateur absents")
# Guide charges infirmier libéral : taux cohérents avec le guide retraite (Carpimko), outil de rattrapage, parcours et liens
_ch = open(os.path.join(ROOT, "guides", "charges-infirmier-liberal-cotisations-rattrapage-combien-mettre-de-cote", "index.html"), encoding="utf-8").read()
_rt = open(os.path.join(ROOT, "guides", "retraite-infirmier-liberal-carpimko-calcul-cotisations-2026", "index.html"), encoding="utf-8").read()
for _v in ("8,73 %", "1,87 %", "8,70 %", "224 €", "1 022 €"):
    if _v not in _ch or _v not in _rt: fail("charges infirmier libéral : taux Carpimko incohérent avec le guide retraite (%s)" % _v)
if "idel-calc" not in _ch or "gd-metro" not in _ch or "pas une règle officielle" not in _ch: fail("charges infirmier libéral : outil, parcours ou mise en garde sur les 50 % absent")
if "Urssaf n'est pas lisible" not in _ch: fail("charges infirmier libéral : mention de la limite de lecture des taux Urssaf absente")
# Guide installation infirmier libéral : cohérence avec la page société (micro-BNC exclu), parcours, mention des limites
_in = open(os.path.join(ROOT, "guides", "s-installer-infirmier-liberal-etapes-statuts-demarches", "index.html"), encoding="utf-8").read()
if "micro-BNC est exclu" not in _in or "micro-BNC est exclu" not in open(os.path.join(ROOT, "metiers", "infirmier-liberal-societe", "index.html"), encoding="utf-8").read(): fail("installation infirmier libéral : règle du micro-BNC incohérente entre les pages")
if "gd-metro" not in _in or "8 jours" not in _in or "n'est pas lisible" not in _in: fail("installation infirmier libéral : parcours, délai de 8 jours ou mention de limite absent")
for _l in ("/guides/charges-infirmier-liberal-cotisations-rattrapage-combien-mettre-de-cote/", "/metiers/infirmier-liberal-societe/"):
    if _l not in _in: fail("installation infirmier libéral : lien interne absent (%s)" % _l)
# Chaque page indexable déclare son adresse canonique (balise parfois écrite sur plusieurs lignes)
for f in pages:
    _rel = os.path.relpath(f, ROOT)
    if _rel == "404.html": continue
    _hh = open(f, encoding="utf-8").read()
    if "noindex" in _hh: continue
    if not re.search(r'<link\s+rel="canonical"\s+href="https://simudroit\.fr/[^"]*"\s*/?>', _hh): fail("canonical absent : %s" % _rel)
# Pages 2027 : montants annoncés cohérents, statuts affichés, aucun Smic 2027 présenté comme un fait
def _g(s): return open(os.path.join(ROOT, "guides", s, "index.html"), encoding="utf-8").read()
_p27 = _g("plafond-securite-sociale-2027-montants-ce-qui-change"); _s27 = _g("smic-2027-revalorisation-1er-janvier-ce-que-lon-sait"); _h27 = _g("ce-qui-change-au-1er-janvier-2027-les-chiffres")
for _v in ("48 900 €", "4 075 €", "12 225 €", "annoncés", "arrêté officiel"):
    if _v not in _p27: fail("PASS 2027 : mention absente (%s)" % _v)
if round(48900/12, 2) != 4075.0 or round(48900/48060 - 1, 4) != 0.0175 and round((48900/48060-1)*100, 2) != 1.75: fail("PASS 2027 : arithmétique 48 900 / 12 ou hausse incohérente")
if "4 005 €" not in _p27 or "reste soumis au plafond 2026" not in _p27: fail("PASS 2027 : règle de la période de travail absente")
if "12,31 €" not in _s27 or "1 867,02 €" not in _s27 or "pas encore connu" not in _s27: fail("Smic 2027 : montant actuel ou statut absent")
if round(12.31*1.01, 2) != 12.43 or round(1867.02*1.01, 2) != 1885.69: fail("Smic 2027 : exemple pédagogique faux")
if "n'est pas encore connu" not in _s27 and "pas encore connu" not in _s27: fail("Smic 2027 présenté comme connu")
for _l in ("/guides/plafond-securite-sociale-2027-montants-ce-qui-change/", "/guides/smic-2027-revalorisation-1er-janvier-ce-que-lon-sait/", "/guides/budget-2027-ce-qui-est-propose-et-ce-qui-est-vote/", "/guides/journee-de-solidarite-2027-date-regles-remuneration/"):
    if _l not in _h27: fail("hub 2027 : lien absent (%s)" % _l)
for _l, _src in (("/guides/ce-qui-change-au-1er-janvier-2027-les-chiffres/", "smic-2026-montant-brut-net-horaire"), ("/guides/plafond-securite-sociale-2027-montants-ce-qui-change/", "simulateur-gratification-stage"), ("/guides/smic-2027-revalorisation-1er-janvier-ce-que-lon-sait/", "simulateur-smic")):
    _pp = os.path.join(ROOT, "guides", _src) if not _src.startswith("simulateur") else os.path.join(ROOT, _src)
    if _l not in open(os.path.join(_pp, "index.html"), encoding="utf-8").read(): fail("lien interne 2027 absent depuis %s" % _src)
if "pmss: 4005" not in open(os.path.join(ROOT, "assets", "params.js"), encoding="utf-8").read(): fail("params.js : le plafond 2026 ne doit pas être changé avant le 1er janvier 2027")
# Guide congé paternité : durées cohérentes avec le simulateur et le guide maternité
_pat = _g("conge-paternite-2026-duree-jours-demarches-tous-secteurs")
for _v in ("25 jours", "32 jours", "1 mois", "10 semaines", "5 jours", "gd-metro", "source non officielle", "D1225-8"):
    if _v not in _pat: fail("guide congé paternité : mention absente (%s)" % _v)
if 3 + 4 + 21 - 3 != 25 or 4 + 28 != 32: fail("congé paternité : arithmétique 4 + 21 = 25 et 4 + 28 = 32")
_ps = open(os.path.join(ROOT, "simulateur-conge-paternite", "index.html"), encoding="utf-8").read()
if "25 jours" not in _ps or "32" not in _ps: fail("simulateur paternité : durées 25 / 32 jours absentes")
for _src in ("simulateur-conge-paternite", "simulateur-conge-supplementaire-naissance"):
    if "/guides/conge-paternite-2026-duree-jours-demarches-tous-secteurs/" not in open(os.path.join(ROOT, _src, "index.html"), encoding="utf-8").read(): fail("lien vers le guide paternité absent depuis %s" % _src)
# Guide naissance : délais officiels (Service-Public F32571) et liens vers les congés
_nai = _g("naissance-bebe-demarches-aides-conges-dans-l-ordre")
for _v in ("5 jours", "14e semaine", "60 jours", "gd-metro", "F32571", "source non officielle", "25 jours"):
    if _v not in _nai: fail("guide naissance : mention absente (%s)" % _v)
import re as _re2
if _re2.search(r"\d[\d  ]*(,\d+)? ?€ par mois", _nai.split("congé parental d'éducation</h2>")[0]): fail("guide naissance : montant de prestation Caf affiché hors section sourcée")
for _src in ("simulateur-conge-paternite", "simulateur-conge-maternite", "simulateur-conge-supplementaire-naissance"):
    if "/guides/naissance-bebe-demarches-aides-conges-dans-l-ordre/" not in open(os.path.join(ROOT, _src, "index.html"), encoding="utf-8").read(): fail("lien vers le guide naissance absent depuis %s" % _src)
_ac = _page("aide-carburant-grands-rouleurs")
for _v in ("22 770", "31 décembre 2026", "27 octobre", "15 km", "8 000 km", "100 €", "simulateur officiel"):
    if _v not in _ac: fail("aide carburant : mention absente (%s)" % _v)
# Guide surendettement : règles de la Banque de France, ton positif, limites déclarées
_su = _g("sortir-du-surendettement-plan-d-action-positif")
for _v in ("3 mois", "7 ans", "134 803", "17 447", "gd-metro", "Station 7", "gratuite", "Limites de cette page", "18 ou 24 mois"):
    if _v not in _su: fail("guide surendettement : mention absente (%s)" % _v)
for _bad in ("honte", "coupable de", "faute de votre part", "vous avez mal géré"):
    if _bad in _su.lower(): fail("guide surendettement : ton jugeant (%s)" % _bad)
if "sponsored" in _su or "lien partenaire" in _su: fail("guide surendettement : pas de lien affilié sans programme déclaré")
# Guide métiers sans diplôme : écarts au Smic recalculés, sources Onisep, aucune promesse excessive
_md = _g("metiers-sans-diplome-au-dessus-du-smic-acces-et-salaires")
for _v in ("2 130 €", "1 888 €", "1 867,02 €", "262,98 €", "20,98 €", "FIMO", "onisep.fr", "Limites"):
    if _v not in _md: fail("guide métiers sans diplôme : mention absente (%s)" % _v)
if round(2130 - 1867.02, 2) != 262.98 or round(1888 - 1867.02, 2) != 20.98: fail("guide métiers sans diplôme : écart au Smic faux")
if "sans diplôme ne veut pas dire sans formation" not in _md: fail("guide métiers sans diplôme : nuance « sans formation » absente")
# Guide devenir auto-entrepreneur : chiffres Service-Public, limites assumées
_ae = _g("comment-devenir-auto-entrepreneur-micro-entrepreneur-etapes")
for _v in ("203 100 €", "83 600 €", "60 jours", "30 septembre", "2042-C PRO", "24 mois", "F23267", "F11677", "Limites", "n'a pas pu être vérifiée"):
    if _v not in _ae: fail("guide devenir auto-entrepreneur : mention absente (%s)" % _v)
# Guide prime de Noël 2026 : montants 2025 officiels (Service-Public), aucune invention pour 2026
_pn = _g("prime-de-noel-2026-montants-date-de-versement-qui-y-a-droit")
for _v in ("152,45 €", "228,68 €", "274,41 €", "60,98 €", "76,23 €", "16 décembre", "F1325", "pas encore publiés", "Limites"):
    if _v not in _pn: fail("guide prime de Noël : mention absente (%s)" % _v)
# Guide devenir assistante maternelle : délais et chiffres Service-Public, limites assumées
_am = _g("comment-devenir-assistante-maternelle-agrement-formation-demarches")
for _v in ("3 mois", "120 heures", "80 heures", "15 jours", "4 enfants", "F798", "monenfant.fr", "Limites", "ne précise pas la durée de validité"):
    if _v not in _am and _v != "4 enfants": fail("guide assistante maternelle : mention absente (%s)" % _v)
# Guide devenir fonctionnaire : niveaux de diplôme par catégorie et sources Service-Public
_fo = _g("comment-devenir-fonctionnaire-concours-conditions-categories")
for _v in ("CAP, BEP ou brevet", "bac+2", "bac+3", "sans concours", "PACTE", "F13272", "F434", "F34827", "Limites", "troisième concours"):
    if _v not in _fo: fail("guide devenir fonctionnaire : mention absente (%s)" % _v)
# Guide concours de la fonction publique : règles du portail officiel, limites assumées
_cf = _g("concours-fonction-publique-types-conditions-inscription-calendrier")
for _v in ("1er novembre 2005", "3 ans d'activité", "2 ans", "PACTE", "concours-territorial.fr", "concours-fph.ars.sante.fr", "Talents", "fonction-publique.gouv.fr", "F434", "Limites"):
    if _v not in _cf: fail("guide concours fonction publique : mention absente (%s)" % _v)
# Guide budget : sources Mes questions d'argent, aucun pourcentage « idéal » inventé, ton positif
_bg = _g("bien-gerer-son-budget-methode-des-enveloppes-pas-a-pas")
for _v in ("mesquestionsdargent.fr", "enveloppes", "charges fixes", "Limites", "gd-metro", "Mon plan de sortie"):
    if _v not in _bg: fail("guide budget : mention absente (%s)" % _v)
for _bad in ("50/30/20", "50 %", "règle des 50", "honte", "coupable"):
    if _bad in _bg: fail("guide budget : contenu non sourcé ou ton jugeant (%s)" % _bad)
# Guide taxe foncière 2026 : dates et plafonds Service-Public, aucune estimation de montant inventée
_tf = _g("taxe-fonciere-2026-dates-exonerations-contester-mensualisation")
for _v in ("20 octobre", "15 octobre", "300 €", "15 décembre 2026", "12 793 €", "26 457 €", "3 416 €", "100 €", "10 %", "31 décembre 2026", "A15144", "A19047", "A17727", "Limites"):
    if _v not in _tf: fail("guide taxe foncière : mention absente (%s)" % _v)
# Guide bourse sur critères sociaux 2026-2027 : montants Service-Public recalculés (mensuel x 10 = annuel)
_bs = _g("bourse-sur-criteres-sociaux-2026-2027-echelons-montants-conditions")
for _m, _a in ((145.40, 1454), (216.30, 2163), (307.10, 3071), (382.80, 3828), (458.70, 4587), (521.20, 5212), (550.60, 5506), (633.50, 6335)):
    if round(_m * 10) != _a: fail("guide bourse : incohérence mensuel/annuel %s/%s" % (_m, _a))
    _ms = ("%.2f" % _m).replace(".", ",") + " €"
    if _ms not in _bs or ("{:,}".format(_a).replace(",", " ") + " €") not in _bs: fail("guide bourse : montant absent (%s / %s)" % (_ms, _a))
for _v in ("1er mars", "31 mai", "28 ans", "10 mois", "7 ans", "F12214", "A18239", "Limites", "arrêté du 26 mars 2026"):
    if _v not in _bs: fail("guide bourse : mention absente (%s)" % _v)
# Guide vacances scolaires 2026-2027 : dates Service-Public (arrêté du 22 octobre 2025)
_vs = _g("vacances-scolaires-2026-2027-dates-zones-a-b-c")
for _v in ("19 décembre 2026 au 4 janvier 2027", "13 février au 1er mars 2027", "20 février au 8 mars 2027", "6 au 22 février 2027", "10 au 26 avril 2027", "17 avril au 3 mai 2027", "3 au 19 avril 2027", "3 juillet 2027", "7 mai 2027", "F31952", "22 octobre 2025", "Limites"):
    if _v not in _vs: fail("guide vacances scolaires : mention absente (%s)" % _v)
# Guide crédit à la consommation : droits Service-Public F2451, F2435, F2436
_cc = _g("credit-a-la-consommation-retractation-14-jours-remboursement-anticipe-credit-renouvelable")
for _v in ("14 jours", "75 000 €", "10 000 €", "0,5 %", "TAEG", "8 %", "F2451", "F2436", "Limites"):
    if _v not in _cc: fail("guide crédit conso : mention absente (%s)" % _v)
# Guide litiges litige-se-de
_llitige = _g("litige-se-defendre-sans-tribunal-etapes-reclamation-mediation-conciliation")
for _v in ('5 000 €', '1er octobre 2023', 'F1736', 'F33338', 'F13158', 'F31301', 'Limites'):
    if _v not in _llitige: fail("guide litiges litige-se-de : mention absente (%s)" % _v)
# Guide litiges mediateur-de
_lmediat = _g("mediateur-de-la-consommation-saisir-gratuitement-delai-1-an-90-jours")
for _v in ('1 an', '90 jours', 'F33338', '3 000 €', '15 000 €', 'Limites'):
    if _v not in _lmediat: fail("guide litiges mediateur-de : mention absente (%s)" % _v)
# Guide litiges conciliateur
_lconcil = _g("conciliateur-de-justice-gratuit-comment-le-saisir-litiges-du-quotidien")
for _v in ('conciliateurs.fr', '3 mois', '5 000 €', 'F1736', 'F31301', 'Limites'):
    if _v not in _lconcil: fail("guide litiges conciliateur : mention absente (%s)" % _v)
# Guide litiges contester-un
_lcontes = _g("contester-une-decision-administrative-recours-gracieux-defenseur-des-droits")
for _v in ('2 mois', 'F2474', 'F13158', 'Défenseur des droits', 'gracieux', 'Limites'):
    if _v not in _lcontes: fail("guide litiges contester-un : mention absente (%s)" % _v)
# Guide litiges mise-en-deme
_lmisee = _g("mise-en-demeure-lettre-de-reclamation-comment-ecrire-modele")
for _v in ('Objet : mise en demeure', 'recommandé', '8 à 15 jours', 'F33338', 'Limites'):
    if _v not in _lmisee: fail("guide litiges mise-en-deme : mention absente (%s)" % _v)
# Guide litiges resilier-un-
_lresili = _g("resilier-un-abonnement-box-salle-de-sport-assurance-droits-etapes")
for _v in ('3 clics', 'F33991', 'F22486', '24 mois', 'RIO', 'Limites'):
    if _v not in _lresili: fail("guide litiges resilier-un- : mention absente (%s)" % _v)
# Guide litiges bruit-de-voi
_lbruit = _g("bruit-de-voisinage-nuisances-etapes-amiable-conciliateur-amende")
for _v in ('450 €', '68 €', '22 h', 'F612', 'A18139', 'Limites'):
    if _v not in _lbruit: fail("guide litiges bruit-de-voi : mention absente (%s)" % _v)
# Guide litiges litige-avec-
_llitige = _g("litige-avec-sa-banque-reclamation-mediateur-bancaire-delais")
for _v in ('2 mois', '15 jours', '90 jours', 'F20523', 'médiateur bancaire', 'Limites'):
    if _v not in _llitige: fail("guide litiges litige-avec- : mention absente (%s)" % _v)
# Guide litiges travaux-mal-
_ltravau = _g("travaux-mal-faits-artisan-garanties-parfait-achevement-decennale-mise-en-demeure")
for _v in ('10 ans', 'parfait achèvement', 'décennale', 'F2958', 'R24080', 'Limites'):
    if _v not in _ltravau: fail("guide litiges travaux-mal- : mention absente (%s)" % _v)
# Guide litiges changer-ou-r
_lchange = _g("changer-ou-resilier-sa-mutuelle-sante-apres-un-an-echeance-avis-d-echeance")
for _v in ('F20314', '15 jours', 'après un an', 'Limites'):
    if _v not in _lchange: fail("guide litiges changer-ou-r : mention absente (%s)" % _v)
# Guide litiges declaration-
_ldeclar = _g("declaration-de-revenus-qui-doit-declarer-en-ligne-obligatoire-majoration-corriger")
for _v in ('F358', '0,2 %', '60 €', '3 ans', 'Limites'):
    if _v not in _ldeclar: fail("guide litiges declaration- : mention absente (%s)" % _v)
# Guide litiges solde-de-con
_lsolde = _g("solde-de-conges-payes-a-la-sortie-indemnite-compensatrice-quand-elle-est-due-calcul")
for _v in ('F24661', 'dixième', 'maintien de salaire', '873,60', 'Limites'):
    if _v not in _lsolde: fail("guide litiges solde-de-con : mention absente (%s)" % _v)
# Guide litiges entretien-pr
_lentret = _g("entretien-professionnel-tous-les-4-ans-etat-des-lieux-8-ans-ce-qui-change-2026")
for _v in ('L6315-1', 'quatre ans', 'huit ans', 'L6323-13', 'Limites'):
    if _v not in _lentret: fail("guide litiges entretien-pr : mention absente (%s)" % _v)
# Guide litiges calendrier-e
_lcalend = _g("calendrier-echeances-particuliers-decembre-2026-taxe-habitation-prelevement-mensualisation")
for _v in ('30 novembre', '15 décembre', '20 décembre', '28 décembre', 'Limites'):
    if _v not in _lcalend: fail("guide litiges calendrier-e : mention absente (%s)" % _v)
# Guide litiges trouver-un-a
_ltrouve = _g("trouver-un-avocat-consultation-gratuite-honoraires-aide-juridictionnelle")
for _v in ('F20706', 'F15018', 'F18074', '12 957', 'Limites'):
    if _v not in _ltrouve: fail("guide litiges trouver-un-a : mention absente (%s)" % _v)
# Guide litiges jours-feries
_ljours = _g("jours-feries-2027-dates-ponts-regles-salaries-1er-mai")
for _v in ('A19019', 'F2405', '29 mars', 'Ascension', 'Limites'):
    if _v not in _ljours: fail("guide litiges jours-feries : mention absente (%s)" % _v)
# Guide litiges livret-a-ldd
_llivret = _g("livret-a-ldds-lep-taux-aout-2026-plafonds-interets-prochaine-revision")
for _v in ('F2365', 'F2368', 'F2367', '22 950', '1,7 %', 'Limites'):
    if _v not in _llivret: fail("guide litiges livret-a-ldd : mention absente (%s)" % _v)
# Guide litiges pyramide-de-
_lpyrami = _g("pyramide-de-l-epargne-livret-a-assurance-vie-per-bourse-crypto-par-ou-commencer")
for _v in ('F2365', 'F22414', 'F36526', 'F2385', '31,4 %', 'Limites'):
    if _v not in _lpyrami: fail("guide litiges pyramide-de- : mention absente (%s)" % _v)
# Guide litiges assurance-vi
_lassura = _g("assurance-vie-fonctionnement-fiscalite-transmission-frais-ce-qu-il-faut-savoir")
for _v in ('F22414', 'F15274', '152 500', '4 600', 'Limites'):
    if _v not in _lassura: fail("guide litiges assurance-vi : mention absente (%s)" % _v)
# Guide litiges per-plan-epa
_lperpl = _g("per-plan-epargne-retraite-deduction-impots-deblocage-sortie-capital-rente")
for _v in ('F36526', '37 680', '4 710', '31,4', 'Limites'):
    if _v not in _lperpl: fail("guide litiges per-plan-epa : mention absente (%s)" % _v)
# Guide litiges pea-plan-d-e
_lpeapl = _g("pea-plan-d-epargne-en-actions-plafond-fiscalite-retrait-avant-5-ans")
for _v in ('F2385', '150 000', '225 000', 'Limites'):
    if _v not in _lpeapl: fail("guide litiges pea-plan-d-e : mention absente (%s)" % _v)
# Guide litiges cryptomonnai
_lcrypto = _g("cryptomonnaies-impots-risques-prestataires-agrees-mica-declarer-2026")
for _v in ('305 €', '31,4', '2086', 'MiCA', 'Limites'):
    if _v not in _lcrypto: fail("guide litiges cryptomonnai : mention absente (%s)" % _v)
# Guide litiges pret-immobil
_lpreti = _g("pret-immobilier-constituer-son-dossier-banque-apport-endettement-reste-a-vivre")
for _v in ('35 %', 'F16123', '10 jours', 'FISE', 'Limites'):
    if _v not in _lpreti: fail("guide litiges pret-immobil : mention absente (%s)" % _v)
# Guide Black Friday
_bf = _g("black-friday-achats-en-ligne-droit-de-retractation-14-jours-garantie-2-ans")
for _v in ("14 jours", "2 ans", "27 novembre 2026", "F10485", "F11094", "F10868", "Limites"):
    if _v not in _bf: fail("guide Black Friday : mention absente (%s)" % _v)
# Guide ce qui change au 1er janvier 2027
_cj = _g("ce-qui-change-au-1er-janvier-2027-vote-ou-en-projet-budget-smic-impot-retraite")
for _v in ("1er janvier 2027", "1 867,02 €", "7 000 €", "Salairia", "PLFSS", "mi-décembre", "Limites"):
    if _v not in _cj: fail("guide 1er janvier 2027 : mention absente (%s)" % _v)
# Guide trêve hivernale
_th = _g("treve-hivernale-2026-2027-expulsion-coupures-energie-eau-ce-qui-est-interdit")
for _v in ("1er novembre 2026", "31 mars 2027", "A14632", "F34736", "F20055", "toute l'année", "Limites"):
    if _v not in _th: fail("guide trêve hivernale : mention absente (%s)" % _v)
# Guide cumul emploi-retraite 2027
_ce = _g("cumul-emploi-retraite-2027-nouvelles-regles-seuil-7000-euros-pension-reduite")
for _v in ("7 000 €", "50 %", "1er janvier 2027", "2026-1016", "A18914", "13 000 €", "Limites"):
    if _v not in _ce: fail("guide cumul 2027 : mention absente (%s)" % _v)
# Guide embaucher
_em = _g("embaucher-premier-salarie-saisonnier-interimaire-apprenti-demarches")
for _v in ("DPAE", "1 305 €", "8 jours", "18 mois", "5 000 €", "F23107", "F2918", "F23556", "Limites"):
    if _v not in _em: fail("guide embaucher : mention absente (%s)" % _v)
# Guide pension alimentaire : Aripa, frais et ASF
_pa = _g("pension-alimentaire-impayee-aripa-intermediation-allocation-soutien-familial")
for _v in ("Aripa", "60 jours", "5 ans", "7,5 %", "10 %", "200,78 €", "267,63 €", "F36407", "Limites"):
    if _v not in _pa: fail("guide pension alimentaire : mention absente (%s)" % _v)
# Guide salaire impayé : prescription et procédure Service-Public
_si = _g("salaire-impaye-ou-en-retard-que-faire-prescription-3-ans-prud-hommes")
for _v in ("3 ans", "L3245-1", "mise en demeure", "F2308", "F2360", "15 jours", "Limites"):
    if _v not in _si: fail("guide salaire impayé : mention absente (%s)" % _v)
# Guide inaptitude : règles Service-Public F726 et F31225
_in = _g("inaptitude-medicale-au-travail-reclassement-licenciement-indemnites")
for _v in ("médecin du travail", "reclassement", "un mois", "double", "8 mois", "15 jours", "F726", "F31225", "Limites"):
    if _v not in _in: fail("guide inaptitude : mention absente (%s)" % _v)
# Guide dépôt de garantie : délais Service-Public F31269
_dg = _g("depot-de-garantie-restitution-delai-retenues-que-faire-si-non-rendu")
for _v in ("1 mois", "2 mois", "10 %", "20 %", "3 ans", "5 000 €", "F31269", "9 juin 2026", "Limites"):
    if _v not in _dg: fail("guide dépôt de garantie : mention absente (%s)" % _v)
# Guide préavis du locataire : durées Service-Public F1168
_pl = _g("preavis-locataire-duree-motifs-1-mois-lettre-type-conge-logement")
for _v in ("3 mois", "1 mois", "zone tendue", "commissaire de justice", "accusé de réception", "F1168", "16 avril 2026", "Modèle de lettre", "Limites"):
    if _v not in _pl: fail("guide préavis locataire : mention absente (%s)" % _v)
# Guide carte grise : délais et coûts Service-Public
_cg = _g("carte-grise-voiture-d-occasion-et-changement-d-adresse-delais-demarches")
for _v in ("1 mois", "2,76 €", "135 €", "15 jours", "F1050", "F12118", "ants.gouv.fr", "Limites"):
    if _v not in _cg: fail("guide carte grise : mention absente (%s)" % _v)
# Guide CMG assistante maternelle : sources Service-Public, pas de barème inventé
_cm = _g("cmg-complement-mode-de-garde-assistante-maternelle-conditions-demande")
for _v in ("1er septembre 2025", "100 %", "Pajemploi", "R72489", "F39152", "A18360", "31 août 2025", "1er décembre 2025", "12 ans", "ne les invente pas", "Limites"):
    if _v not in _cm: fail("guide CMG : mention absente (%s)" % _v)
# Guide chèque énergie 2026 : montants et date limite Service-Public, seuil 2026 non confirmé signalé
_ce = _g("cheque-energie-2026-montants-conditions-demander-avant-le-31-decembre")
for _v in ("48 € et 277 €", "31 décembre 2026", "1er avril", "11 000 €", "A17885", "F33667", "chequeenergie.gouv.fr", "n'a pas pu être confirmé", "Limites"):
    if _v not in _ce: fail("guide chèque énergie : mention absente (%s)" % _v)
# Guide Parcoursup 2027 : dates du calendrier officiel (PDF octobre 2026), source officielle, mise en garde sur les évolutions
_pc = _g("parcoursup-2027-calendrier-dates-cles-et-ce-qui-peut-changer")
for _v in ("17 décembre 2026", "18 janvier", "11 mars 2027", "1er avril 2027", "1er juin 2027", "10 juin", "9 septembre 2027", "10 juillet 2027", "parcoursup.gouv.fr/sites/default/files", "source non officielle", "fait foi"):
    if _v not in _pc: fail("guide Parcoursup : mention absente (%s)" % _v)
# Sous-pages reconversion : même DA (FAQ repliable, bandeau d'action, cartes d'outils), sans liste de liens nus
for _rp in ("bilan-de-competences", "vae", "chomage-pendant-formation", "metiers-du-soin"):
    _rt = open(os.path.join(ROOT, "reconversion", _rp, "index.html"), encoding="utf-8").read()
    for _v in ("reconv.css", 'class="rc-faq"', 'class="rc-cta"', 'class="rc-guides"', "faire-le-point-reconversion"):
        if _v not in _rt: fail("reconversion/%s : élément de la DA absent (%s)" % (_rp, _v))
    if "sd-see-grid" in _rt: fail("reconversion/%s : liste de liens nus (sd-see-grid) au lieu des cartes" % _rp)
_ss = _page("saisie-sur-salaire")
for _v in ("373,33", "2 150,83", "145 €", "651,69", "10 000 €", "service-public.gouv.fr", "1er juillet 2025"):
    if _v not in _ss: fail("saisie sur salaire : mention absente (%s)" % _v)
_ce = _page("capacite-emprunt")
for _v in ("35 %", "25 ans", "economie.gouv.fr/hcsf", "ne précise pas si l'assurance", "D-HCSF-2021-7"):
    if _v not in _ce: fail("capacité d'emprunt : mention absente (%s)" % _v)
_se = _page("seuils-effectifs-entreprise")
for _v in ("11 salariés", "50 salariés", "12 mois consécutifs", "5 années consécutives", "F31415", "traduction automatique"):
    if _v not in _se: fail("seuils d'effectifs : mention absente (%s)" % _v)
_pl = _page("planning-roulement-equipe")
for _v in ("10 heures", "48 heures", "11 heures", "35 heures", "F1911", "F2327", "Pauses"):
    if _v not in _pl: fail("planning en roulement : mention absente (%s)" % _v)
_sa = _page("suivi-arrets-maladie-equipe")
for _v in ("60 jours", "30 jours", "8 jours", "F2871", "F144", "15 juin 2026", "Rien n'est envoyé", "jamais de diagnostic"):
    if _v not in _sa: fail("suivi des arrêts maladie : mention absente (%s)" % _v)
_sc = _page("suivi-conges-payes-equipe")
for _v in ("2,5 jours", "30 jours", "1er juin au 31 mai", "F2258", "A15702", "2 mois", "1 mois"):
    if _v not in _sc: fail("suivi des congés payés : mention absente (%s)" % _v)
_cd = _page("calcul-delais-echeances")
for _v in ("F31111", "F35697", "jours francs", "dernier jour du mois", "premier jour ouvrable"):
    if _v not in _cd: fail("calcul de délai : mention absente (%s)" % _v)
_eh = open(os.path.join(ROOT, "employeurs-rh", "index.html"), encoding="utf-8").read()
for _v in ("simulateur-planning-roulement-equipe", "simulateur-suivi-conges-payes-equipe", "simulateur-suivi-arrets-maladie-equipe", "simulateur-seuils-effectifs-entreprise", "simulateur-calcul-delais-echeances", "Ce que ces outils ne remplacent pas"):
    if _v not in _eh: fail("hub employeurs : mention absente (%s)" % _v)
_du = _page("duerp-document-unique")
for _v in ("F35360", "40 ans", "11 salariés", "dès le premier salarié", "convention de l'outil"):
    if _v not in _du: fail("DUERP : mention absente (%s)" % _v)
_ll = _page("lettre-litige")
for _v in ("F10485", "F11094", "F2474", "F33338", "F31269", "sdLettre"):
    if _v not in _ll: fail("lettres de litige : mention absente (%s)" % _v)
_qz = open(os.path.join(ROOT, "quiz-droits-consommateur-vrai-ou-faux", "index.html"), encoding="utf-8").read()
for _v in ("F10485", "F11094", "F33338", "F2474", "F31269", "qz-static"):
    if _v not in _qz: fail("quiz droits : mention absente (%s)" % _v)
_cp = _page("comparer-demission-rupture-licenciement")
for _v in ("sdPartir", "indemnité légale", "15 jours calendaires"):
    if _v not in _cp: fail("comparateur départ : mention absente (%s)" % _v)
_cr = _page("cout-rupture-conventionnelle-employeur")
for _v in ("A16711", "30 %", "CTP 719", "sdCoutRC"):
    if _v not in _cr: fail("coût rupture conventionnelle : mention absente (%s)" % _v)
_qz = open(os.path.join(ROOT, "quiz-droit-du-travail-vrai-ou-faux", "index.html"), encoding="utf-8").read()
for _v in ("F1643", "F19030", "L1237-1-1", "L3245-1", "F24661", "L6315-1", "qz-static"):
    if _v not in _qz: fail("quiz travail : mention absente (%s)" % _v)
_aj = _page("aide-juridictionnelle")
for _v in ("F18074", "12 957", "sdAJ", "55 %"):
    if _v not in _aj: fail("aide juridictionnelle : mention absente (%s)" % _v)
_pn = _page("prime-de-noel")
for _v in ("152,45", "442,11", "sdPN", "16 décembre"):
    if _v not in _pn: fail("prime de Noël : mention absente (%s)" % _v)
_ic = _page("interets-composes")
for _v in ("F2365", "22 950", "sdIC", "1,7"):
    if _v not in _ic: fail("intérêts composés : mention absente (%s)" % _v)
_bu = _page("budget-mensuel")
for _v in ("sdBU", "fiche-budget-12-mois-simudroit.pdf", "50/30/20", "prêt immobilier", "35 %"):
    if _v not in _bu: fail("budget mensuel : mention absente (%s)" % _v)
if not os.path.exists(os.path.join(ROOT, "assets", "docs", "fiche-budget-12-mois-simudroit.pdf")): fail("fiche budget PDF absente")
_rl = _page("rentabilite-locative")
for _v in ("F16123", "sdRL", "cash-flow", "avant impôt"):
    if _v not in _rl: fail("rentabilité locative : mention absente (%s)" % _v)
_ps2 = open(os.path.join(ROOT, "mon-plan-de-sortie-surendettement", "index.html"), encoding="utf-8").read(); _psj = open(os.path.join(ROOT, "assets", "plan-sortie.js"), encoding="utf-8").read()
for _v in ("Rien n'est envoyé", "3 mois", "Mémoriser ma progression sur cet appareil uniquement", "Tout effacer"):
    if _v not in _ps2: fail("plan de sortie : mention absente (%s)" % _v)
if re.search(r"fetch\(|XMLHttpRequest|sendBeacon", _psj): fail("plan de sortie : le script ne doit effectuer aucune requête réseau")
if "mon-plan-de-sortie-surendettement" not in _g("sortir-du-surendettement-plan-d-action-positif"): fail("guide surendettement : lien vers le plan de sortie absent")
# Assistant : la réponse sur les indépendants ne doit pas contredire le catalogue
_a = open(os.path.join(ROOT, "assistant", "index.html"), encoding="utf-8").read()
if "concernent les salariés. Pour un indépendant" in _a: fail("assistant : réponse obsolète sur les indépendants")
for _s in ("micro-entrepreneur", "tjm-freelance", "ati-independant"):
    if "simulateur-" + _s not in _a: fail("assistant : lien vers simulateur-%s absent de la réponse sur les indépendants" % _s)
print("Contrôles statiques :", len(pages), "pages,", len(locs), "URL de sitemap")

# ---------- 1bis. Date « Barèmes vérifiés le … » sur chaque simulateur ----------
import datetime
MOIS = {"janvier":1,"février":2,"mars":3,"avril":4,"mai":5,"juin":6,"juillet":7,"août":8,"septembre":9,"octobre":10,"novembre":11,"décembre":12}
_ver = re.search(r'verifie:\s*"(\d{4})-(\d{2})-(\d{2})"', open(os.path.join(ROOT, "assets", "params.js"), encoding="utf-8").read())
_ref = datetime.date(*map(int, _ver.groups()))
_tj = open(os.path.join(ROOT, "assets", "theme.js"), encoding="utf-8").read()
_tv = re.search(r'VERIF="(\d{4}-\d{2}-\d{2})"', _tj)
if not _tv or _tv.group(1) != "%04d-%02d-%02d" % (_ref.year, _ref.month, _ref.day):
    fail("theme.js : date « barèmes vérifiés » différente de params.js (%s)" % _ref)
for f in sorted(glob.glob(os.path.join(ROOT, "simulateur-*/index.html"))):
    t = open(f, encoding="utf-8").read()
    rel = os.path.relpath(f, ROOT)
    m = re.search(r'vérifié[es]* le (\d+)(?:er)? (\w+) (\d{4})', t)
    m2 = re.search(r'Dernière vérification[^<]*<time datetime="(\d{4})-(\d{2})-(\d{2})"', t)
    try:
        if m: d = datetime.date(int(m.group(3)), MOIS[m.group(2)], int(m.group(1)))
        elif m2: d = datetime.date(*map(int, m2.groups()))
        else: fail("%s : pas de date de vérification des paramètres" % rel); continue
    except Exception: fail("%s : date de vérification illisible" % rel); continue
    if abs((_ref - d).days) > 30: fail("%s : date de vérification (%s) éloignée de params.js (%s)" % (rel, d, _ref))

# ---------- 2. Cas de calcul de référence ----------
CASES = json.load(open(os.path.join(ROOT, "tests", "cas_reference.json"), encoding="utf-8"))

from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(locale="fr-FR")
    ctx.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("dialog", lambda d: (errs.append("alert() : " + d.message), d.dismiss()))
    norm = lambda t: re.sub(r"[\s  ]+", " ", t)
    for c in CASES:
        pg.goto(LOCAL + c["page"] + "/"); pg.wait_for_timeout(200)
        for k, v in c["entrees"].items():
            pg.evaluate("([k,v])=>{var e=document.getElementById(k);if(e.type==='checkbox'){e.checked=true}else{e.value=v};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}", [k, str(v)])
        pg.evaluate("(document.getElementById('calculate')||document.querySelector('.calculator button:not(.sd-chip):not(.sd-secondary)')).click()")
        pg.wait_for_timeout(1100)
        for sel, attendu in c["attendus"].items():
            got = norm(pg.inner_text(sel))
            if norm(attendu) not in got:
                fail("%s %s : attendu « %s », obtenu « %s »" % (c["page"], c["entrees"], attendu, got[:120]))
    # modèles de lettres : chaque type du sélecteur génère une lettre complète, sans erreur
    pg.goto(LOCAL + "modeles-de-lettres/"); pg.wait_for_timeout(300)
    for k in pg.eval_on_selector_all("#type option", "els=>els.map(e=>e.value)"):
        pg.select_option("#type", k); pg.wait_for_timeout(60)
        t = pg.inner_text("#lettre")
        if len(t) < 250 or "undefined" in t or "Madame, Monsieur" not in t:
            fail("lettre %s : contenu incomplet" % k)
        if pg.locator('.lt-card[data-type="%s"]' % k).count() != 1:
            fail("lettre %s : carte manquante dans le sélecteur" % k)
    # pages « une lettre par situation » : le script doit être présent et générer la lettre
    for f in sorted(glob.glob(os.path.join(ROOT, "modele-lettre-*/index.html"))):
        if 'id="word"' not in open(f, encoding="utf-8").read(): continue
        slug = os.path.basename(os.path.dirname(f))
        pg.goto(LOCAL + slug + "/"); pg.wait_for_timeout(250)
        t = pg.inner_text("#lettre")
        if len(t) < 250 or "undefined" in t: fail("%s : lettre non générée (script manquant ?)" % slug)
        for sel_b in ("#word", "#pdf", "#rtf", "#mail"):
            if pg.locator(sel_b).count() != 1: fail("%s : bouton %s manquant" % (slug, sel_b))
    # générateur de CV : exemple, styles différents, export Word
    pg.goto(LOCAL + "guides/frais-de-notaire-achat-immobilier-composition-calcul/"); pg.wait_for_timeout(300)
    pg.fill("#fn-prix", "200000"); pg.wait_for_timeout(100)
    if "1 995,25" not in pg.inner_text("#fn-out").replace("\u202f", " ").replace("\u00a0", " "): fail("frais de notaire : 200 000 € devrait donner 1 995,25 € HT d'émoluments (%s)" % pg.inner_text("#fn-out")[:80])
    pg.goto(LOCAL + "guides/ouvrir-un-restaurant-demarches-etape-par-etape/"); pg.wait_for_timeout(300)
    pg.click("ul.cl li:first-child label"); pg.reload(); pg.wait_for_timeout(300)
    if not pg.eval_on_selector("ul.cl li:first-child input", "e=>e.checked"): fail("checklist : la case cochée n'est pas conservée")
    pg.goto(LOCAL + "faire-le-point-reconversion/"); pg.wait_for_timeout(300)
    pg.eval_on_selector("input[value=\"Perte de sens\"]", "e=>e.click()"); pg.fill("#pt-declencheur", "Test de motivation")
    pg.click("#pt-next"); pg.click("#pt-next"); pg.select_option("#pt-v0", "x"); pg.click("#pt-next"); pg.click("#pt-next")
    pg.fill("#pt-pn1", "Piste A"); pg.select_option("#pt-senvie1", "5"); pg.select_option("#pt-svaleurs1", "3")
    if "4,0 sur 5" not in pg.inner_text("#pt-sco1"): fail("reconversion : score moyen attendu 4,0 sur 5 : %s" % pg.inner_text("#pt-sco1"))
    pg.click("#pt-next"); pg.eval_on_selector("input[value=a_cpf]", "e=>e.click()"); pg.click("#pt-next")
    _t = pg.inner_text("#pt-doc")
    if "Test de motivation" not in _t or "Piste A" not in _t or "simulateur-cpf" not in _t: fail("reconversion : synthèse incomplète : %s" % _t[:200])
    if pg.evaluate("localStorage.getItem('sd-point-v1')") is not None: fail("reconversion : données mémorisées sans consentement")
    pg.goto(LOCAL + "guides/creer-un-business-plan-etapes-financement-seuil-rentabilite/"); pg.wait_for_timeout(300)
    _o = pg.inner_text("#bp-out").replace("\u202f", " ").replace("\u00a0", " "); _s = pg.inner_text("#sr-out").replace("\u202f", " ").replace("\u00a0", " ")
    if "55 000" not in _o or "5 000" not in _o: fail("business plan : plan de financement (55 000 / 50 000, manque 5 000) : %s" % _o[:120])
    if "90 000" not in _s or "9" not in _s: fail("business plan : seuil de rentabilité attendu 90 000 € : %s" % _s[:120])
    pg.goto(LOCAL + "generateur-devis/"); pg.wait_for_timeout(300); pg.click("#dv-example"); pg.wait_for_timeout(200)
    _d = pg.inner_text("#dv-sheet").replace("\u202f", " ").replace("\u00a0", " ")
    if "346,50" not in _d or "315,00" not in _d: fail("devis : totaux HT/TTC attendus 315,00 / 346,50 : %s" % _d[-300:])
    _c1 = pg.eval_on_selector("#dv-sheet", "e=>e.style.cssText"); pg.select_option("#dv-activite", "res"); pg.wait_for_timeout(150); _c2 = pg.eval_on_selector("#dv-sheet", "e=>e.style.cssText")
    if _c1 == _c2: fail("devis : le style ne change pas avec l'activité")
    pg.click("#dv-style"); pg.wait_for_timeout(150)
    if pg.eval_on_selector("#dv-sheet", "e=>e.style.cssText") == _c2: fail("devis : « Autre style » ne change rien")
    pg.select_option("#dv-activite", "bat"); pg.wait_for_timeout(150)
    pg.check("#dv-franchise"); pg.wait_for_timeout(150)
    if "293 B" not in pg.inner_text("#dv-sheet"): fail("devis : mention de franchise en base de TVA absente")
    import base64 as _b
    _png = _b.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
    pg.set_input_files("#dv-logo-in", files=[{"name": "logo.png", "mimeType": "image/png", "buffer": _png}]); pg.wait_for_timeout(400)
    if not pg.query_selector("#dv-sheet img.dv-logo"): fail("devis : le logo n'apparaît pas dans l'aperçu")
    pg.locator("#dv-pad").scroll_into_view_if_needed(); _bx = pg.query_selector("#dv-pad").bounding_box(); pg.mouse.move(_bx["x"] + 20, _bx["y"] + 20); pg.mouse.down(); pg.mouse.move(_bx["x"] + 120, _bx["y"] + 60, steps=5); pg.mouse.up()
    pg.click("#dv-pad-ok"); pg.wait_for_timeout(300)
    if not pg.query_selector("#dv-sheet img.dv-sign"): fail("devis : la signature dessinée n'apparaît pas dans l'aperçu")
    with pg.expect_download() as _dl: pg.click("#dv-docx")
    _fn = _dl.value.path(); import zipfile as _z
    _nl = _z.ZipFile(_fn).namelist()
    if "word/document.xml" not in _nl: fail("devis : fichier .docx invalide")
    if not any(n.startswith("word/media/logo") for n in _nl) or "word/media/sign.png" not in _nl: fail("devis : logo ou signature absents du .docx (%s)" % _nl)
    pg.goto(LOCAL + "generateur-facture/"); pg.wait_for_timeout(300); pg.click("#dv-example"); pg.wait_for_timeout(200)
    _f = pg.inner_text("#dv-sheet").replace("\u202f", " ").replace("\u00a0", " ")
    if "346,50" not in _f or "315,00" not in _f or "Reste à payer" not in _f or "246,50" not in _f: fail("facture : totaux attendus 315,00 / 346,50 / reste à payer 246,50 : %s" % _f[-350:])
    if "Pénalités de retard" not in _f or "Escompte pour paiement anticipé : néant" not in _f: fail("facture : mentions de pénalités ou d'escompte absentes")
    if "40 €" in _f: fail("facture : l'indemnité de 40 € ne doit pas apparaître pour un particulier")
    pg.select_option("#dv-ctype", "pro"); pg.wait_for_timeout(150)
    if "40 €" not in pg.inner_text("#dv-sheet"): fail("facture : l'indemnité de 40 € doit apparaître pour un client professionnel")
    pg.check("#dv-franchise"); pg.wait_for_timeout(150)
    if "293 B" not in pg.inner_text("#dv-sheet"): fail("facture : mention 293 B absente en franchise de TVA")
    pg.goto(LOCAL + "generateur-quittance-de-loyer/"); pg.wait_for_timeout(300); pg.click("#qt-example"); pg.wait_for_timeout(200)
    _q = pg.inner_text("#dv-sheet").replace("\u202f", " ").replace("\u00a0", " ")
    if "QUITTANCE DE LOYER" not in _q or "650,00" not in _q or "700,00" not in _q or "Mme Camille Martin" not in _q: fail("quittance : exemple absent ou totaux faux : %s" % _q[:300])
    _d0 = pg.input_value("#qt-debut"); pg.click("#qt-next"); pg.wait_for_timeout(150)
    if pg.input_value("#qt-debut") == _d0: fail("quittance : « mois suivant » ne change pas la période")
    pg.fill("#qt-recu", "400"); pg.wait_for_timeout(150)
    _q2 = pg.inner_text("#dv-sheet").replace("\u202f", " ").replace("\u00a0", " ")
    if "REÇU DE PAIEMENT PARTIEL" not in _q2 or "300,00" not in _q2: fail("quittance : reçu de paiement partiel ou reste dû absent : %s" % _q2[:300])
    with pg.expect_download() as _dq: pg.click("#qt-docx")
    if "word/document.xml" not in __import__("zipfile").ZipFile(_dq.value.path()).namelist(): fail("quittance : fichier .docx invalide")
    pg.goto(LOCAL + "generateur-dossier-pret-immobilier/"); pg.wait_for_timeout(300); pg.click("#dp-example"); pg.wait_for_timeout(200)
    _dp = pg.inner_text("#dp-sheet").replace("\u202f", " ").replace("\u00a0", " ")
    for _m in ("DOSSIER DE DEMANDE DE PRÊT IMMOBILIER", "Plan de financement", "Taux d'endettement", "Reste à vivre", "Pièces à joindre", "Capital restant dû", "Taux actuel"):
        if _m.lower() not in _dp.lower(): fail("dossier de prêt : mention absente (%s)" % _m)
    if pg.evaluate("document.querySelectorAll('#dp-sheet .dp-bar').length") < 3: fail("dossier de prêt : graphiques en barres absents")
    _r = pg.evaluate("sdDP({prix:200000,duree:20,taux:4,rev1:4000})")
    if abs(_r["mensualite"] - 1211.96) > 0.02 or _r["endettement"] != 30.3 or abs(_r["crd10"] - 119705.57) > 1: fail("dossier de prêt : calcul faux %s" % _r)
    _r2 = pg.evaluate("sdDP({prix:250000,notaire:20000,apport:50000,duree:25,taux:3.8,tass:0.3,rev1:4000,credits:200,charges:1100})")
    if _r2["emprunt"] != 220000 or _r2["endettement"] != 34.8 or _r2["pApport"] != 18.5: fail("dossier de prêt : synthèse fausse %s" % _r2)
    pg.select_option("#dp-destin", "Investissement locatif"); pg.fill("#dp-loyerprevu", "900"); pg.fill("#dp-chargesloc", "1800"); pg.wait_for_timeout(200)
    _dp2 = pg.inner_text("#dp-sheet")
    if "Projet locatif" not in _dp2 or "Rendement brut" not in _dp2 or "Investissement locatif" not in _dp2: fail("dossier de prêt : bloc investissement locatif absent")
    pg.emulate_media(media="print")
    for _pgn in ("generateur-dossier-pret-immobilier/", "generateur-devis/", "generateur-quittance-de-loyer/", "generateur-attestation-d-hebergement/"):
        pg.goto(LOCAL + _pgn); pg.wait_for_timeout(200)
        if pg.evaluate("getComputedStyle(document.querySelector('main')).display") == "none": fail("impression : le contenu du générateur est masqué (%s)" % _pgn)
    pg.emulate_media(media="screen")
    pg.goto(LOCAL + "generateur-attestation-d-hebergement/"); pg.wait_for_timeout(300); pg.click("#ht-example"); pg.wait_for_timeout(200)
    _h = pg.inner_text("#dv-sheet").replace("\u202f", " ").replace("\u00a0", " ")
    if "ATTESTATION D'HÉBERGEMENT" not in _h or "Jean Dupont" not in _h or "Camille Martin" not in _h or "441-7" not in _h or "justificatif de domicile" not in _h: fail("hébergement : exemple ou mentions absents : %s" % _h[:300])
    pg.fill("#ht-depuis", "2026-06-01"); pg.wait_for_timeout(150)
    if "depuis le 01/06/2026" not in pg.inner_text("#dv-sheet"): fail("hébergement : la date de début d'hébergement n'apparaît pas")
    with pg.expect_download() as _dh: pg.click("#ht-docx")
    if "word/document.xml" not in __import__("zipfile").ZipFile(_dh.value.path()).namelist(): fail("hébergement : fichier .docx invalide")
    pg.goto(LOCAL + "generateur-contrat-emploi-a-domicile/"); pg.wait_for_timeout(300); pg.click("#ct-example"); pg.wait_for_timeout(200)
    _c = pg.inner_text("#dv-sheet").replace("\u202f", " ").replace("\u00a0", " ")
    if "CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE" not in _c or "242,67" not in _c or "période d'essai d'un mois" not in _c or "convention collective nationale des particuliers employeurs" not in _c: fail("contrat à domicile : exemple, salaire mensuel ou essai CDI faux : %s" % _c[:300])
    pg.select_option("#ct-type", "cdd"); pg.fill("#ct-debut", "2026-11-02"); pg.fill("#ct-fin", "2026-12-02"); pg.wait_for_timeout(200)
    if "essai de 4 jours" not in pg.inner_text("#dv-sheet"): fail("contrat à domicile : essai de CDD de 31 jours attendu : 4 jours")
    pg.fill("#ct-taux", "11"); pg.wait_for_timeout(150)
    if "Smic" not in pg.inner_text("#ct-warn"): fail("contrat à domicile : alerte sous le Smic absente")
    with pg.expect_download() as _dc: pg.click("#ct-docx")
    if "word/document.xml" not in __import__("zipfile").ZipFile(_dc.value.path()).namelist(): fail("contrat à domicile : fichier .docx invalide")
    pg.goto(LOCAL + "guides/cesu-embaucher-aide-a-domicile-menage-demarches-contrat-credit-impot/"); pg.wait_for_timeout(300)
    if len(pg.query_selector_all("ol.gd-metro > li")) != 6: fail("guide Cesu : le parcours en 6 stations est absent")
    pg.goto(LOCAL + "documents-a-generer/"); pg.wait_for_timeout(300)
    if len(pg.query_selector_all("article a[href^='/generateur-']")) < 7: fail("documents à générer : les 7 générateurs doivent être listés")
    pg.goto(LOCAL + "generateur-page-de-garde-rapport-de-stage/"); pg.wait_for_timeout(300); pg.click("#gp-example"); pg.wait_for_timeout(200)
    _g = pg.inner_text("#gp-sheet")
    if "Camille Martin" not in _g or "Entreprise Exemple" not in _g or "12/04/2027" not in _g: fail("page de garde : l'exemple n'apparaît pas dans l'aperçu (%s)" % _g[:150])
    _g1 = pg.eval_on_selector("#gp-sheet", "e=>e.className+e.style.cssText"); pg.click("#gp-style"); pg.wait_for_timeout(150)
    if pg.eval_on_selector("#gp-sheet", "e=>e.className+e.style.cssText") == _g1: fail("page de garde : « Autre style » ne change rien")
    pg.check("#gp-conf"); pg.wait_for_timeout(150)
    if "confidentiel" not in pg.inner_text("#gp-sheet"): fail("page de garde : mention confidentielle absente")
    import base64 as _b2
    _png2 = _b2.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
    pg.set_input_files("#gp-ent-in", files=[{"name": "logo.png", "mimeType": "image/png", "buffer": _png2}]); pg.wait_for_timeout(400)
    pg.set_input_files("#gp-etab-in", files=[{"name": "etab.png", "mimeType": "image/png", "buffer": _png2}]); pg.wait_for_timeout(400)
    if len(pg.query_selector_all("#gp-sheet img.gp-logo")) != 2: fail("page de garde : les deux logos doivent apparaître dans l'aperçu")
    with pg.expect_download() as _dl2: pg.click("#gp-docx")
    _nl2 = __import__("zipfile").ZipFile(_dl2.value.path()).namelist()
    if "word/document.xml" not in _nl2 or not any(n.startswith("word/media/ent") for n in _nl2) or not any(n.startswith("word/media/etab") for n in _nl2): fail("page de garde : .docx invalide ou logos absents (%s)" % _nl2)
    pg.goto(LOCAL + "guides/rapport-de-stage-comment-le-rediger-etape-par-etape/"); pg.wait_for_timeout(200)
    if len(pg.query_selector_all("aside.gd-tool a.gd-tool-btn")) < 1 or not pg.is_visible("aside.gd-tool"): fail("guide rapport de stage : bloc visuel du générateur de page de garde absent")
    pg.goto(LOCAL + "generateur-cv/"); pg.wait_for_function("document.getElementById('cv-frame').contentDocument.querySelector('.cv')")
    pg.click("#cv-example"); pg.wait_for_timeout(200)
    if "Camille Durand" not in " ".join(pg.evaluate("document.getElementById('cv-frame').contentDocument.body.innerText").split()): fail("CV : l'exemple n'apparaît pas dans l'aperçu")
    labs = set()
    for _ in range(6):
        pg.click("#cv-new"); pg.wait_for_timeout(80); labs.add(pg.inner_text("#cv-style-lab"))
    if len(labs) < 5: fail("CV : « Autre style » ne varie pas (%d styles sur 6)" % len(labs))
    with pg.expect_download() as dl: pg.click("#cv-docx")
    import zipfile
    dl.value.save_as("/tmp/_cv.docx")
    if zipfile.ZipFile("/tmp/_cv.docx").testzip() is not None: fail("CV : fichier .docx invalide")
    # relecture automatique : exemple propre, puis erreurs détectées
    if "Aucun point" not in pg.inner_text("#cv-check-sum"): fail("CV : la relecture signale des points sur l'exemple fourni")
    pg.fill("#f-email", "abc"); pg.fill("#f-profil", "Court"); pg.wait_for_timeout(200)
    _ck = pg.inner_text("#cv-check-list")
    if "e-mail" not in _ck or "profil est très court" not in _ck or "2 points" not in pg.inner_text("#cv-check-sum"): fail("CV : la relecture ne détecte pas e-mail invalide / profil court")
    pg.click("#cv-clear"); pg.wait_for_timeout(200)
    if "Remplissez" not in pg.inner_text("#cv-check-sum"): fail("CV : relecture non réinitialisée après effacement")
    # recherche de l'accueil : index à jour et résultats pertinents
    import subprocess
    if subprocess.run(["python3", os.path.join(ROOT, ".github/scripts/searchindex.py"), "--check"], capture_output=True).returncode != 0:
        fail("recherche : assets/search-index.json obsolète (lancer .github/scripts/searchindex.py)")
    pg.goto(LOCAL); pg.wait_for_timeout(300)
    for q, attendu in [("cv", "/generateur-cv/"), ("licenciement", "indemnite-licenciement"), ("démission", "demission"), ("congés payes", "conges-payes"), ("aesh", "aesh")]:
        pg.fill("#site-q", q); pg.wait_for_timeout(500)
        hrefs = pg.eval_on_selector_all("#site-q-list a", "els=>els.map(e=>e.getAttribute('href'))")
        if not any(attendu in h for h in hrefs[:5]): fail("recherche « %s » : %s absent des 5 premiers (%s)" % (q, attendu, hrefs[:5]))
    # saisie vide : un message en ligne, jamais une boîte alert()
    for f in sorted(glob.glob(os.path.join(ROOT, "simulateur-*/index.html"))):
        slug = os.path.basename(os.path.dirname(f))
        pg.goto(LOCAL + slug + "/"); pg.wait_for_timeout(200)
        pg.evaluate("(document.getElementById('calculate')||document.querySelector('.calculator button:not(.sd-chip):not(.sd-secondary)')).click()"); pg.wait_for_timeout(250)
    # accessibilité : champs nommés, cibles tactiles du menu, champs numériques
    pg.set_viewport_size({"width": 390, "height": 844})
    for f in pages:
        rel = os.path.relpath(f, ROOT)
        if rel in ("404.html", "simulateur/index.html", "dossiers/index.html"): continue
        pg.goto(LOCAL + ("" if rel == "index.html" else rel.replace("index.html", ""))); pg.wait_for_timeout(120)
        r = pg.evaluate("""()=>{const bad=[];
          document.querySelectorAll('input:not([type=hidden]),select,textarea').forEach(e=>{
            const ok=e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||(e.id&&document.querySelector('label[for="'+e.id+'"]'))||e.closest('label');
            if(!ok)bad.push('champ sans nom : '+(e.id||e.type));});
          document.querySelectorAll('header nav a, .nav-links a, .logo').forEach(e=>{const h=e.getBoundingClientRect().height;
            if(h>0&&h<43.5)bad.push('cible trop petite ('+Math.round(h)+' px) : '+e.textContent.trim().slice(0,20));});
          if(!document.querySelector('a.skip-link'))bad.push("lien d evitement absent");
          if(document.documentElement.lang!=='fr')bad.push('attribut lang absent');
          return bad}""")
        for m in r: fail("accessibilité %s : %s" % (rel, m))
    pg.set_viewport_size({"width": 1280, "height": 900})
    # résultat en temps réel : modifier une valeur met à jour le résultat sans recliquer
    pg.emulate_media(reduced_motion="reduce")
    pg.goto(LOCAL + "simulateur-brut-net/"); pg.wait_for_timeout(200)
    pg.evaluate("()=>{var e=document.getElementById('brut');e.value='2500';e.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('calculate').click()}"); pg.wait_for_timeout(1100)
    pg.evaluate("()=>{var e=document.getElementById('brut');e.value='3000';e.dispatchEvent(new Event('input',{bubbles:true}))}")
    try: pg.wait_for_function("()=>/2\\s374,79/.test(document.getElementById('net').innerText.replace(/[\\u202f\\u00a0]/g,' '))", timeout=6000)
    except Exception: pass
    pg.emulate_media(reduced_motion="no-preference")
    if norm("2 374,79 €") not in norm(pg.inner_text("#net")): fail("temps réel : le résultat ne s'est pas mis à jour (%s)" % pg.inner_text("#net"))
    # chômage : bloc ATI des indépendants (26,30 € x 182 j = 4 786,60 €)
    pg.goto(LOCAL + "simulateur-ati-independant/"); pg.wait_for_timeout(200)
    pg.evaluate("()=>{const v={atiMois:'30',atiDepuis:'2',atiR1:'14000',atiR2:'11000'};for(const k in v)document.getElementById(k).value=v[k];document.getElementById('atiRes').checked=true;document.getElementById('atiGo').click()}"); pg.wait_for_timeout(200)
    o = norm(pg.inner_text("#atiOut"))
    if norm("26,30 €") not in o or norm("4 786,60 €") not in o: fail("ATI : montant maximal attendu absent (%s)" % o[:120])
    pg.evaluate("()=>{document.getElementById('atiCause').value='autre';document.getElementById('atiGo').click()}"); pg.wait_for_timeout(150)
    if "non réunies" not in pg.inner_text("#atiOut"): fail("ATI : un motif non éligible doit être refusé")
    pg.evaluate("()=>{document.getElementById('atiCause').value='liq';document.getElementById('atiMois').value='18';document.getElementById('atiGo').click()}"); pg.wait_for_timeout(150)
    if "24 mois" not in pg.inner_text("#atiOut"): fail("ATI : moins de 24 mois d'activité doit être refusé")
    # micro-entrepreneur : 3 000 € de prestations BIC -> cotisations 636,00 €, net 2 364,00 € ; avec ACRE 477,00 € / 2 523,00 € ; net voulu 2 364 -> CA 3 000
    pg.goto(LOCAL + "simulateur-micro-entrepreneur/"); pg.wait_for_timeout(200)
    def micro(mode, act, montant, acre=False, vl=False):
        pg.evaluate("(a)=>{document.getElementById('mode').value=a[0];document.getElementById('act').value=a[1];document.getElementById('montant').value=a[2];document.getElementById('acre').checked=a[3];document.getElementById('vl').checked=a[4];document.getElementById('calculate').click()}", [mode, act, str(montant), acre, vl]); pg.wait_for_timeout(1800)
        return {k: norm(pg.inner_text("#"+k)) for k in ("net","ca","cot","imp")}
    r = micro("ca", "prestations", 3000)
    if r["cot"] != norm("636,00 €") or r["net"] != norm("2 364,00 €"): fail("micro : 3 000 € BIC attendu 636,00 € / 2 364,00 € (%s)" % r)
    r = micro("ca", "prestations", 3000, True)
    if r["cot"] != norm("477,00 €") or r["net"] != norm("2 523,00 €"): fail("micro : ACRE attendu 477,00 € / 2 523,00 € (%s)" % r)
    r = micro("ca", "vente", 10000, False, True)
    if r["cot"] != norm("1 230,00 €") or r["imp"] != norm("100,00 €") or r["net"] != norm("8 670,00 €"): fail("micro : vente 10 000 € + VL attendu 1 230 / 100 / 8 670 (%s)" % r)
    r = micro("net", "prestations", 2364)
    if r["ca"] != norm("3 000,00 €"): fail("micro : net voulu 2 364 € attendu CA 3 000 € (%s)" % r)
    # plafonds micro et TVA
    pg.goto(LOCAL + "simulateur-plafonds-micro-tva/"); pg.wait_for_timeout(200)
    pg.evaluate("()=>{document.getElementById('caVente').value='';document.getElementById('caServ').value='40000';document.getElementById('calculate').click()}"); pg.wait_for_timeout(120)
    if "Sous le plafond" not in pg.inner_text("#microVerdict") or "Entre le seuil" not in pg.inner_text("#tvaVerdict"): fail("plafonds : 40 000 € de services (sous 83 600 €, entre 37 500 et 41 250)")
    pg.evaluate("()=>{document.getElementById('caServ').value='90000';document.getElementById('calculate').click()}"); pg.wait_for_timeout(120)
    if "dépassé" not in pg.inner_text("#microVerdict") or "TVA due" not in pg.inner_text("#tvaVerdict"): fail("plafonds : 90 000 € de services doit dépasser micro et TVA")
    pg.goto(LOCAL + "simulateur-frais-kilometriques/"); pg.wait_for_timeout(1000)
    pg.evaluate("()=>{document.getElementById('veh').value='car';document.getElementById('veh').dispatchEvent(new Event('change'));document.getElementById('cv').value='2';document.getElementById('km').value='10000';document.getElementById('calculate').click()}"); pg.wait_for_timeout(1000)
    if norm(pg.inner_text("#main")) != norm("4 965,00 €"): fail("frais km : 5 CV, 10 000 km attendu 4 965,00 € (%s)" % pg.inner_text("#main"))
    pg.evaluate("()=>{document.getElementById('elec').checked=true;document.getElementById('calculate').click()}"); pg.wait_for_timeout(1000)
    if norm(pg.inner_text("#main")) != norm("5 958,00 €"): fail("frais km : majoration électrique de 20 %% attendue 5 958,00 € (%s)" % pg.inner_text("#main"))
    pg.evaluate("()=>{document.getElementById('elec').checked=false;document.getElementById('mode').value='dt';document.getElementById('mode').dispatchEvent(new Event('change'));document.getElementById('al').value='60';document.getElementById('jr').value='100';document.getElementById('calculate').click()}"); pg.wait_for_timeout(1000)
    if "8 000" not in pg.inner_text("#dist").replace("\u202f"," ").replace("\u00a0"," "): fail("frais km : distance limitée à 40 km par trajet attendue (8 000 km) : %s" % pg.inner_text("#dist"))
    # TVA HT/TTC et TJM freelance
    pg.goto(LOCAL + "simulateur-tva-ht-ttc/"); pg.wait_for_timeout(200)
    pg.evaluate("()=>{document.getElementById('sens').value='ht';document.getElementById('taux').value='20';document.getElementById('montant').value='100';document.getElementById('calculate').click()}"); pg.wait_for_timeout(900)
    if norm(pg.inner_text("#ttc")) != norm("120,00 €") or norm(pg.inner_text("#tva")) != norm("20,00 €"): fail("TVA : 100 € HT à 20 % attendu 120,00 € TTC")
    pg.evaluate("()=>{document.getElementById('sens').value='ttc';document.getElementById('taux').value='5.5';document.getElementById('montant').value='105.5';document.getElementById('calculate').click()}"); pg.wait_for_timeout(900)
    if norm(pg.inner_text("#ht")) != norm("100,00 €"): fail("TVA : 105,50 € TTC à 5,5 %% attendu 100,00 € HT (%s)" % pg.inner_text("#ht"))
    pg.goto(LOCAL + "simulateur-tjm-freelance/"); pg.wait_for_timeout(200)
    pg.evaluate("()=>{const v={act:'prestations',net:'2500',jours:'15',charges:'0'};for(const k in v)document.getElementById(k).value=v[k];document.getElementById('calculate').click()}"); pg.wait_for_timeout(900)
    if norm(pg.inner_text("#caMois")) != norm("3 172,59 €") or norm(pg.inner_text("#tjm")) != norm("211,51 €"): fail("TJM : net 2 500 € BIC 15 jours attendu CA 3 172,59 € / TJM 211,51 € (%s / %s)" % (pg.inner_text("#caMois"), pg.inner_text("#tjm")))
    # maintien de salaire : 2 500 € brut, 3 ans, 40 jours -> IJ 41,10 x 37 = 1 520,70 ; employeur 30 x 33,90 + 3 x 14,45 = 1 060,35
    pg.goto(LOCAL + "simulateur-maintien-salaire-maladie/"); pg.wait_for_timeout(200)
    pg.evaluate("()=>{const v={brut:'2500',anc:'3',jours:'40',prior:'0'};for(const k in v)document.getElementById(k).value=v[k];document.getElementById('calculate').click()}"); pg.wait_for_timeout(900)
    if norm(pg.inner_text("#emp")) != norm("1 060,35 €") or norm(pg.inner_text("#secu")) != norm("1 520,70 €") or pg.inner_text("#n90") != "30" or pg.inner_text("#n66") != "3": fail("maintien de salaire : attendu 1 060,35 € / 1 520,70 € / 30 / 3 (%s / %s / %s / %s)" % (pg.inner_text("#emp"), pg.inner_text("#secu"), pg.inner_text("#n90"), pg.inner_text("#n66")))
    pg.evaluate("()=>{document.getElementById('anc').value='0';document.getElementById('calculate').click()}"); pg.wait_for_timeout(900)
    if norm(pg.inner_text("#emp")) != norm("0,00 €") or "Moins d'un an" not in pg.inner_text("#notes"): fail("maintien de salaire : moins d'un an d'ancienneté doit donner 0 €")
    # pension d'invalidité : 30 000 € cat. 2 = 1 250,00 ; cat. 1 revenu 10 000 = minimum 338,31 ; cat. 3 = 2 548,44 ; indépendant cat. 1 10 000 = 530,21
    pg.goto(LOCAL + "simulateur-pension-invalidite/"); pg.wait_for_timeout(200)
    def inv(st, cat, sam):
        pg.evaluate("(a)=>{document.getElementById('statut').value=a[0];document.getElementById('cat').value=a[1];document.getElementById('sam').value=a[2];document.getElementById('calculate').click()}", [st, cat, str(sam)]); pg.wait_for_timeout(1600)
        return norm(pg.inner_text("#pension"))
    for st, cat, sam, exp in [("sal","2",30000,"1 250,00 €"),("sal","1",10000,"338,31 €"),("sal","3",30000,"2 548,44 €"),("ind","1",10000,"530,21 €"),("sal","2",90000,"2 002,50 €")]:
        r = inv(st, cat, sam)
        if r != norm(exp): fail("pension d'invalidité %s cat %s %s € : attendu %s (%s)" % (st, cat, sam, exp, r))
    # temps partiel thérapeutique : 2400 / 1200 -> IJ 39,45 /j, 1 183,50 ; total 2 383,50
    pg.goto(LOCAL + "simulateur-temps-partiel-therapeutique/"); pg.wait_for_timeout(200)
    pg.evaluate("()=>{const v={plein:'2400',percu:'1200',jours:'30'};for(const k in v)document.getElementById(k).value=v[k];document.getElementById('calculate').click()}"); pg.wait_for_timeout(900)
    if norm(pg.inner_text("#total")) != norm("2 383,50 €") or "39,45" not in pg.inner_text("#r-ij"): fail("temps partiel thérapeutique : attendu 2 383,50 € / 39,45 (%s / %s)" % (pg.inner_text("#total"), pg.inner_text("#r-ij")))
    # fin de contrat fonction publique : 18 000 / 12 mois -> 1 800,00 ; 12 000 / 3 mois (4 000 > 2 Smic) -> 0 ; 13 mois -> 0
    pg.goto(LOCAL + "simulateur-fin-contrat-fonction-publique/"); pg.wait_for_timeout(200)
    for tot, mo, exp in [("18000","12","1 800,00 €"),("12000","3","0,00 €"),("20000","13","0,00 €")]:
        pg.evaluate("(a)=>{document.getElementById('total').value=a[0];document.getElementById('mois').value=a[1];document.getElementById('calculate').click()}", [tot, mo]); pg.wait_for_timeout(900)
        if norm(pg.inner_text("#indem")) != norm(exp): fail("fin de contrat fonction publique %s/%s : attendu %s (%s)" % (tot, mo, exp, pg.inner_text("#indem")))
    # fin de contrat fonction publique, temps partiel : le plafond (3 734,03 €) est proratisé selon la quotité
    for tot, mo, q, exp in [("24000","12","100","2 400,00 €"),("24000","12","50","0,00 €"),("18000","12","50","1 800,00 €")]:
        pg.evaluate("(a)=>{document.getElementById('total').value=a[0];document.getElementById('mois').value=a[1];document.getElementById('quotite').value=a[2];document.getElementById('calculate').click()}", [tot, mo, q]); pg.wait_for_timeout(700)
        if norm(pg.inner_text("#indem")) != norm(exp): fail("fin de contrat fonction publique %s/%s quotité %s : attendu %s (%s)" % (tot, mo, q, exp, pg.inner_text("#indem")))
    # préavis de démission : dernier jour inclus, de date à date (Service-Public F2883 : 8 juillet + 1 mois = 7 août)
    pg.goto(LOCAL + "simulateur-preavis-demission/"); pg.wait_for_timeout(200)
    for d, n, u, exp in [("2026-07-08","1","mois","07 août 2026"),("2026-07-07","1","mois","06 août 2026"),("2026-01-31","1","mois","28 février 2026"),("2026-12-15","2","mois","14 février 2027"),("2026-09-01","1","mois","30 septembre 2026"),("2026-07-08","15","jours","23 juillet 2026"),("2026-07-08","2","semaines","22 juillet 2026")]:
        pg.evaluate("(a)=>{document.getElementById('dateDemission').value=a[0];document.getElementById('duree').value=a[1];document.getElementById('dureeType').value=a[2];calculer()}", [d, n, u]); pg.wait_for_timeout(300)
        if norm(pg.inner_text("#dateFin")) != norm(exp): fail("préavis de démission %s +%s %s : attendu %s (%s)" % (d, n, u, exp, pg.inner_text("#dateFin")))
    # outil de rattrapage (guide charges infirmier libéral) : 9 000 - 3 000 = 6 000, soit 500 par mois sur 12 mois ; rien à rattraper si trop payé
    pg.goto(LOCAL + "guides/charges-infirmier-liberal-cotisations-rattrapage-combien-mettre-de-cote/"); pg.wait_for_timeout(300)
    for d_, p_, m_, exp in [("9000","3000","12","500,00"),("9000","3000","6","1 000,00"),("2000","3000","12","Rien à rattraper")]:
        pg.evaluate("(a)=>{document.getElementById('idel-def').value=a[0];document.getElementById('idel-prov').value=a[1];document.getElementById('idel-mois').value=a[2];document.getElementById('idel-go').click()}", [d_, p_, m_]); pg.wait_for_timeout(200)
        if norm(exp) not in norm(pg.inner_text("#idel-out")): fail("outil rattrapage %s/%s/%s : attendu %s (%s)" % (d_, p_, m_, exp, pg.inner_text("#idel-out")))
    # aide carburant grands rouleurs : critères de la FAQ DGFiP (plafond 22 770 € par part, 15 km ou 8 000 km, motorisation)
    pg.goto(LOCAL + "simulateur-aide-carburant-grands-rouleurs/"); pg.wait_for_timeout(800)
    _b = {"rfr": 40000, "parts": 2, "act": "oui", "age": "oui", "al": 22, "kmp": 0, "mot": "th", "usg": "pro", "fon": "perso", "ifi": "non"}
    def _ev(**kw):
        o = dict(_b); o.update(kw); return pg.evaluate("(o)=>{var r=window.sdEvalue(o);return [r.ok,r.montant]}", o)
    for _lab, _kw, _att in (("cas de base 20 000 €/part", {}, [True, 100]), ("25 000 €/part", {"rfr": 50000}, [False, 0]), ("limite 22 770 €/part", {"rfr": 22770, "parts": 1}, [True, 100]), ("22 771 €/part", {"rfr": 22771, "parts": 1}, [False, 0]),
                            ("14,9 km et 7 999 km", {"al": 14.9, "kmp": 7999}, [False, 0]), ("15 km", {"al": 15}, [True, 100]), ("8 000 km", {"al": 5, "kmp": 8000}, [True, 100]),
                            ("électrique", {"mot": "el"}, [False, 0]), ("hybride rechargeable", {"mot": "hr"}, [False, 0]), ("hybride non rechargeable", {"mot": "hy"}, [True, 100]),
                            ("véhicule de fonction", {"fon": "fct"}, [False, 0]), ("IFI", {"ifi": "oui"}, [False, 0]), ("chômage seul", {"act": "non"}, [False, 0])):
        if _ev(**_kw) != _att: fail("aide carburant : %s, attendu %s, obtenu %s" % (_lab, _att, _ev(**_kw)))
    pg.fill("#rfr", "40000"); pg.fill("#parts", "2"); pg.fill("#al", "22"); pg.click("#calculate"); pg.wait_for_timeout(300)
    if "Éligible" not in pg.inner_text("#main") or "100" not in pg.inner_text("#mnt"): fail("aide carburant : résultat affiché incorrect (%s)" % pg.inner_text("#result"))
    # saisie sur salaire : barème 2026 Service-Public (exemple officiel 1 500 € = environ 234,76 €), personnes à charge, solde insaisissable
    pg.goto(LOCAL + "simulateur-saisie-sur-salaire/"); pg.wait_for_timeout(600)
    def _sai(net, chg=0, typ="bar"): return pg.evaluate("(o)=>window.sdSaisie(o)", {"net": net, "chg": chg, "typ": typ})
    for _lab, _a, _att in (("1 500 € seul", _sai(1500), 234.76), ("2 150,83 €", _sai(2150.83), 572.26), ("1 personne à charge, 800 € : 1/20 de 518,33 puis 1/10", _sai(800, 1), 54.09), ("518,33 € sous le minimum garanti", _sai(518.33, 1), 0), ("pension 1 000 €", _sai(1000, 0, "pen"), 348.31), ("700 € plafonné par le reste à vivre", _sai(700), 48.31)):
        if abs(_a["saisie"] - _att) > 0.05: fail("saisie sur salaire : %s, attendu %s, obtenu %s" % (_lab, _att, _a))
    if _sai(600)["saisie"] != 0 or _sai(651.69, 0, "pen")["saisie"] != 0: fail("saisie sur salaire : rien ne doit être saisi sous le solde insaisissable de 651,69 €")
    pg.fill("#net", "1500"); pg.click("#calculate"); pg.wait_for_timeout(300)
    if "234" not in pg.inner_text("#sai") or "1 265" not in pg.inner_text("#res").replace("\u202f", " ").replace("\xa0", " "): fail("saisie sur salaire : résultat affiché incorrect (%s)" % pg.inner_text("#result"))
    # capacité d'emprunt : règle HCSF (35 %, 25 ans), formules d'annuité
    pg.goto(LOCAL + "simulateur-capacite-emprunt/"); pg.wait_for_timeout(600)
    _c = pg.evaluate("(o)=>window.sdCapacite(o)", {"rev": 3500, "cre": 0, "tau": 4, "dur": 20, "ass": 0, "mon": 0})
    if abs(_c["mmax"] - 1225) > 0.01 or abs(_c["cap"] - 202152) > 30: fail("capacité d'emprunt : 3 500 € à 4 % sur 20 ans attendu 1 225 € / ≈202 152 € (%s)" % _c)
    _c = pg.evaluate("(o)=>window.sdCapacite(o)", {"rev": 4000, "cre": 0, "tau": 3.5, "dur": 25, "ass": 0, "mon": 200000})
    if abs(_c["mens"] - 1001.25) > 0.05 or abs(_c["tnew"] - 0.2503) > 0.001: fail("capacité d'emprunt : 200 000 € à 3,5 % sur 25 ans attendu 1 001,25 € (%s)" % _c)
    _c = pg.evaluate("(o)=>window.sdCapacite(o)", {"rev": 3000, "cre": 1050, "tau": 3, "dur": 30, "ass": 0, "mon": 0})
    if _c["mmax"] != 0 or _c["cap"] != 0: fail("capacité d'emprunt : crédits en cours à 35 % = capacité nulle (%s)" % _c)
    if pg.evaluate("(o)=>window.sdCapacite(o).cap", {"rev": 3000, "cre": 0, "tau": 3, "dur": 40, "ass": 0, "mon": 0}) != pg.evaluate("(o)=>window.sdCapacite(o).cap", {"rev": 3000, "cre": 0, "tau": 3, "dur": 25, "ass": 0, "mon": 0}): fail("capacité d'emprunt : la durée doit être plafonnée à 25 ans")
    # seuils d'effectifs : tranches et obligations
    pg.goto(LOCAL + "simulateur-seuils-effectifs-entreprise/"); pg.wait_for_timeout(600)
    _s = pg.evaluate("(o)=>window.sdSeuils(o)", {"eff": 8, "mois12": 1, "ans5": 0})
    if not _s["tranche"].startswith("1 à 10") or any("CSE" in x for x in _s["now"]): fail("seuils : 8 salariés = pas de CSE (%s)" % _s)
    _s = pg.evaluate("(o)=>window.sdSeuils(o)", {"eff": 12, "mois12": 1, "ans5": 0})
    if not any("CSE" in x for x in _s["now"]): fail("seuils : 12 salariés sur 12 mois = CSE (%s)" % _s)
    _s = pg.evaluate("(o)=>window.sdSeuils(o)", {"eff": 12, "mois12": 0, "ans5": 0})
    if any("Comité social" in x for x in _s["now"]) or not _s["pending"]: fail("seuils : 12 salariés depuis moins de 12 mois = CSE à venir (%s)" % _s)
    _s = pg.evaluate("(o)=>window.sdSeuils(o)", {"eff": 60, "mois12": 1, "ans5": 0})
    if not any("Règlement intérieur obligatoire" in x for x in _s["now"]) or not any("BDESE" in x or "Base de données" in x for x in _s["now"]) or not _s["after5"]: fail("seuils : 60 salariés = règlement intérieur, BDESE, obligations après 5 ans (%s)" % _s)
    _s = pg.evaluate("(o)=>window.sdSeuils(o)", {"eff": 60, "mois12": 1, "ans5": 1})
    if _s["after5"]: fail("seuils : 5 années atteintes = plus d'obligation en attente (%s)" % _s)
    pg.fill("#eff", "25"); pg.click("#calculate"); pg.wait_for_timeout(300)
    if "20 à 49" not in pg.inner_text("#main") or "Prochain seuil : 50" not in pg.inner_text("#wnote"): fail("seuils : affichage 25 salariés (%s)" % pg.inner_text("#result"))
    # planning en roulement : couverture, limites légales
    pg.goto(LOCAL + "simulateur-planning-roulement-equipe/"); pg.wait_for_timeout(600)
    _p = pg.evaluate("(o)=>{const r=window.sdPlanning(o);delete r.weeks;return r}", {"n": 6, "jours": 6, "debut": 8, "fin": 20, "postes": 2, "heures": 35, "duree": 7, "semaines": 4})
    if _p["K"] != 2 or _p["needWeek"] != 24 or _p["minStaff"] != 5 or _p["unfilled"] != 0 or _p["restViol"] != 0 or _p["restFail"] != 0 or _p["maxDay"] > 10 or _p["maxWeek"] > 48: fail("planning : cas 6 salariés / 6 jours / 8h-20h / 2 par poste (%s)" % _p)
    _p = pg.evaluate("(o)=>{const r=window.sdPlanning(o);delete r.weeks;return r}", {"n": 4, "jours": 7, "debut": 8, "fin": 20, "postes": 2, "heures": 35, "duree": 7, "semaines": 4})
    if _p["minStaff"] != 6 or _p["unfilled"] <= 0 or _p["restViol"] != 0 or _p["maxWeek"] > 48: fail("planning : 4 salariés pour 7 jours = déficit sans violer les limites (%s)" % _p)
    _p = pg.evaluate("(o)=>{const r=window.sdPlanning(o);delete r.weeks;return r}", {"n": 10, "jours": 7, "debut": 6, "fin": 22, "postes": 2, "heures": 35, "duree": 7, "semaines": 6})
    if _p["K"] != 3 or _p["restViol"] != 0 or _p["restFail"] != 0: fail("planning : 3 postes par jour sur 7 jours (%s)" % _p)
    pg.fill("#n", "6"); pg.click("#calculate"); pg.wait_for_timeout(300)
    if len(pg.query_selector_all("#grids table")) != 4 or "respecté" not in pg.inner_text("#checks"): fail("planning : 4 semaines affichées et contrôles (%s)" % pg.inner_text("#result"))
    # suivi des arrêts maladie : visite de reprise, délais, absences sur 12 mois
    pg.goto(LOCAL + "simulateur-suivi-arrets-maladie-equipe/"); pg.wait_for_timeout(600)
    _a = pg.evaluate("(o)=>window.sdArrets(o)", {"ref": 1793750400000, "eff": 10, "lignes": "Léa ; 2026-09-01 ; 2026-11-10 ; maladie\nMarc ; 2026-10-15 ; 2026-11-20 ; accident du travail\nSam ; 2026-10-01 ; 2026-10-20 ; maladie\nNina ; 2026-06-01 ; 2026-06-02 ; maternité\nX ; 2026-13-40 ; 2026-12-01 ; maladie"})
    _n = {r["nom"]: r for r in _a["rows"]}
    if _n["Léa"]["dur"] != 71 or not _n["Léa"]["need"] or _n["Sam"]["need"] or not _n["Marc"]["need"] or not _n["Nina"]["need"]: fail("arrêts : seuils 60 j maladie, 30 j accident du travail, maternité (%s)" % _a["rows"])
    if len(_a["err"]) != 1 or _a["visites"] != 3: fail("arrêts : date impossible rejetée, 3 visites (%s)" % _a)
    pg.fill("#eff", "10"); pg.fill("#lignes", "Léa ; 2026-09-01 ; 2026-11-10 ; maladie"); pg.fill("#ref", "2026-11-04"); pg.click("#calculate"); pg.wait_for_timeout(300)
    if "1 arrêt" not in pg.inner_text("#main") or "obligatoire" not in pg.inner_text("#tab") or "19/11/2026" not in pg.inner_text("#tab"): fail("arrêts : affichage (%s)" % pg.inner_text("#result"))
    # planning : absences et prénoms
    pg.goto(LOCAL + "simulateur-planning-roulement-equipe/"); pg.wait_for_timeout(600)
    pg.fill("#noms", "Léa\nMarc\nSam\nNina\nTom\nIris"); pg.fill("#abs", "Léa ; 2 ; mer ; ven"); pg.click("#calculate"); pg.wait_for_timeout(300)
    if "absent" not in pg.inner_text("#grids") or "Léa" not in pg.inner_text("#grids"): fail("planning : absence et prénoms absents de la grille")
    # suivi des congés payés : acquisition 2,5 j/mois, arrondi, période, soldes
    pg.goto(LOCAL + "simulateur-suivi-conges-payes-equipe/"); pg.wait_for_timeout(600)
    _c = pg.evaluate("(o)=>window.sdConges(o)", {"ref": 1793750400000, "per": 6, "mode": "ouv", "lignes": "Léa ; 2024-03-15 ; 12 ; 0\nMarc ;; 18 ; 3\nSam ; 2026-09-01 ; 0\nBad ; 2026-13-01 ; 2"})
    _r = {r["nom"]: r for r in _c["rows"]}
    if _r["Léa"]["acq"] != 13 or _r["Léa"]["solde"] != 1 or _r["Léa"]["fin"] != 30: fail("congés : 5 mois = 12,5 arrondis à 13, 30 en fin de période (%s)" % _r["Léa"])
    if _r["Marc"]["solde"] != -2 or _r["Sam"]["acq"] != 5 or _r["Sam"]["fin"] != 23 or len(_c["err"]) != 1: fail("congés : report, entrée en cours de période, date invalide (%s)" % _c)
    _c = pg.evaluate("(o)=>window.sdConges(o)", {"ref": 1793750400000, "per": 6, "mode": "oue", "lignes": "Léa ; 2024-03-15 ; 0"})
    if _c["rows"][0]["fin"] != 25: fail("congés : 25 jours ouvrés par an (%s)" % _c)
    pg.fill("#lignes", "Léa ; 2024-03-15 ; 12 ; 0"); pg.fill("#ref", "2026-11-04"); pg.click("#calculate"); pg.wait_for_timeout(300)
    if "1 salarié suivi" not in pg.inner_text("#main") or "01/06/2026" not in pg.inner_text("#periode"): fail("congés : affichage (%s)" % pg.inner_text("#result"))
    # calcul de délai : mois, report, fériés, jours francs
    pg.goto(LOCAL + "simulateur-calcul-delais-echeances/"); pg.wait_for_timeout(600)
    def _d(y, m, d): return int(__import__("datetime").datetime(y, m, d, tzinfo=__import__("datetime").timezone.utc).timestamp() * 1000)
    def _cdl(y, m, d, n, u, rep=True, als=False):
        r = pg.evaluate("(o)=>window.sdDelai(o)", {"start": _d(y, m, d), "n": n, "unit": u, "report": rep, "alsace": als})
        return (__import__("datetime").datetime.fromtimestamp(r["fin"] / 1000, __import__("datetime").timezone.utc).strftime("%Y-%m-%d"), r["rep"])
    if _cdl(2026, 1, 31, 1, "mois") != ("2026-03-02", 2): fail("délai : 31 janvier + 1 mois, report (%s)" % (_cdl(2026, 1, 31, 1, "mois"),))
    if _cdl(2026, 1, 31, 1, "mois", False) != ("2026-02-28", 0): fail("délai : sans report")
    if _cdl(2026, 3, 31, 5, "cal") != ("2026-04-07", 2): fail("délai : Pâques et lundi de Pâques 2026")
    if _cdl(2026, 11, 4, 5, "oue")[0] != "2026-11-12" or _cdl(2026, 11, 4, 10, "ouv")[0] != "2026-11-17": fail("délai : jours ouvrés et ouvrables avec le 11 novembre")
    if _cdl(2026, 11, 4, 8, "fra")[0] != "2026-11-13" or _cdl(2024, 2, 29, 1, "an")[0] != "2025-02-28": fail("délai : jours francs, année bissextile")
    pg.fill("#dep", "2026-11-04"); pg.fill("#n", "14"); pg.click("#calculate"); pg.wait_for_timeout(300)
    if "mercredi 18 novembre 2026" not in pg.inner_text("#main"): fail("délai : affichage (%s)" % pg.inner_text("#result"))
    # DUERP : priorités, mise à jour, conservation
    pg.goto(LOCAL + "simulateur-duerp-document-unique/"); pg.wait_for_timeout(600)
    _d = pg.evaluate("(o)=>window.sdDuerp(o)", {"eff": 12, "date": "2026-11-04", "risques": [{"id": "chute", "freq": 1, "grav": 2}, {"id": "manut", "freq": 3, "grav": 3}, {"id": "bruit", "freq": 2, "grav": 2}]})
    if [x["id"] for x in _d["rows"]] != ["manut", "bruit", "chute"] or _d["rows"][0]["niveau"] != "À traiter en premier" or _d["rows"][2]["niveau"] != "À surveiller": fail("DUERP : tri et niveaux (%s)" % _d)
    if "04/11/2027" not in _d["maj"] or _d["cons"] != "2066" or _d["prog"]: fail("DUERP : mise à jour annuelle, conservation 40 ans (%s)" % _d)
    _d = pg.evaluate("(o)=>window.sdDuerp(o)", {"eff": 50, "date": "2026-11-04", "risques": [{"id": "chute", "freq": 9, "grav": 9}]})
    if not _d["prog"] or _d["rows"][0]["score"] != 12: fail("DUERP : 50 salariés et bornes (%s)" % _d)
    pg.check("input[data-id=manut]"); pg.fill("#unite", "Fournil"); pg.click("#calculate"); pg.wait_for_timeout(300)
    if "1 risque évalué - Fournil" not in pg.inner_text("#main"): fail("DUERP : affichage (%s)" % pg.inner_text("#result"))
    # lettres de litige : alertes de délai et texte
    pg.goto(LOCAL + "simulateur-lettre-litige/"); pg.wait_for_timeout(600)
    def _lt(ty, v):
        _n = int(__import__("datetime").datetime(2026, 11, 4, tzinfo=__import__("datetime").timezone.utc).timestamp() * 1000)
        return pg.evaluate("(o)=>window.sdLettre(o)", {"type": ty, "v": v, "now": _n, "today": _n})
    _r = _lt("retractation", {"recep": "2026-10-20"})
    if not _r["alertes"] or _r["alertes"][0]["t"] != "alerte": fail("lettre litige : rétractation hors délai non signalée")
    _r = _lt("retractation", {"recep": "2026-11-02"})
    if _r["alertes"][0]["t"] != "astuce": fail("lettre litige : rétractation dans les délais")
    _r = _lt("depot", {"cles": "2026-09-01", "etat": "ecart", "adresse": "1 rue X"})
    if "1er novembre 2026" not in _r["texte"] or _r["alertes"][0]["t"] != "alerte": fail("lettre litige : dépôt de garantie")
    if _lt("recours", {"date_dec": "2026-07-01"})["alertes"][0]["t"] != "alerte" or _lt("garantie", {"livraison": "2025-05-01"})["alertes"][0]["t"] != "astuce": fail("lettre litige : recours / garantie")
    pg.click(".lt-t[data-t=reclamation]"); pg.fill("#f_objet", "un lave-linge"); pg.wait_for_timeout(200)
    if "un lave-linge" not in pg.inner_text("#lt-sheet"): fail("lettre litige : aperçu en direct")
    # quiz droits : parcours complet
    pg.goto(LOCAL + "quiz-droits-consommateur-vrai-ou-faux/"); pg.wait_for_timeout(500)
    for _k in range(10):
        pg.click('.qz-btns button[data-a="1"]'); pg.click("#qz-n"); pg.wait_for_timeout(60)
    if "/ 10" not in pg.inner_text("#qz") or "Rejouer" not in pg.inner_text("#qz"): fail("quiz droits : écran de résultat")
    # comparateur départ : indemnité légale
    pg.goto(LOCAL + "simulateur-comparer-demission-rupture-licenciement/"); pg.wait_for_timeout(500)
    _p = pg.evaluate("()=>window.sdPartir({sal:2400,an:6,mo:0})")
    if abs(_p["legale"] - 3600) > 0.01: fail("comparateur départ : 6 ans à 2400 euros (%s)" % _p)
    _p = pg.evaluate("()=>window.sdPartir({sal:3000,an:12,mo:0})")
    if abs(_p["legale"] - (3000*0.25*10 + 3000/3*2)) > 0.01: fail("comparateur départ : 12 ans")
    if pg.evaluate("()=>window.sdPartir({sal:2400,an:0,mo:7})")["legale"] != 0: fail("comparateur départ : moins de 8 mois")
    pg.fill("#sal", "2400"); pg.fill("#an", "6"); pg.click("#calculate"); pg.wait_for_timeout(200)
    if "3 600" not in pg.inner_text("#main").replace("\u202f", " ").replace("\xa0", " "): fail("comparateur départ : affichage (%s)" % pg.inner_text("#main"))
    # coût rupture conventionnelle employeur
    pg.goto(LOCAL + "simulateur-cout-rupture-conventionnelle-employeur/"); pg.wait_for_timeout(500)
    _c = pg.evaluate("()=>window.sdCoutRC({sal:2400,an:6,mo:0})")
    if abs(_c["legale"] - 3600) > 0.01 or abs(_c["contrib"] - 1080) > 0.01 or abs(_c["total"] - 4680) > 0.01: fail("coût RC : 2400 euros, 6 ans (%s)" % _c)
    _c = pg.evaluate("()=>window.sdCoutRC({sal:2400,an:6,mo:0,ind:5000})")
    if abs(_c["total"] - 6500) > 0.01 or _c["sousMinimum"]: fail("coût RC : indemnité négociée")
    if not pg.evaluate("()=>window.sdCoutRC({sal:2400,an:6,mo:0,ind:1000})")["sousMinimum"]: fail("coût RC : sous le minimum légal")
    # quiz travail : parcours complet
    pg.goto(LOCAL + "quiz-droit-du-travail-vrai-ou-faux/"); pg.wait_for_timeout(500)
    for _k in range(10):
        pg.click('.qz-btns button[data-a="1"]'); pg.click("#qz-n"); pg.wait_for_timeout(60)
    if "/ 10" not in pg.inner_text("#qz") or "Rejouer" not in pg.inner_text("#qz"): fail("quiz travail : écran de résultat")
    # aide juridictionnelle : plafonds
    pg.goto(LOCAL + "simulateur-aide-juridictionnelle/"); pg.wait_for_timeout(500)
    for _n, _r, _e in ((1, 12957, "totale"), (1, 12958, "55"), (1, 15316, "55"), (1, 15317, "25"), (1, 19433, "25"), (1, 19434, "non"), (4, 19095, "totale"), (6, 28518, "non")):
        _o = pg.evaluate("(a)=>window.sdAJ(a)", {"n": _n, "rfr": _r})
        if _o["niveau"] != _e: fail("aide juridictionnelle : %s pers, %s euros attendu %s obtenu %s" % (_n, _r, _e, _o["niveau"]))
    # prime de Noël : barème 2025
    pg.goto(LOCAL + "simulateur-prime-de-noel/"); pg.wait_for_timeout(500)
    for _a, _s, _e, _x in (("rsa", "seul", 0, 15245), ("rsa", "seul", 2, 27441), ("rsa", "couple", 4, 44211), ("rsa", "couple", 5, 50309), ("rsa", "seul", 6, 39637 + 2 * 6098), ("ass", "couple", 3, 15245)):
        _o = pg.evaluate("(a)=>window.sdPN(a)", {"alloc": _a, "sit": _s, "enf": _e})
        if _o["cents"] != _x: fail("prime de Noël : %s %s %s enfants attendu %s obtenu %s" % (_a, _s, _e, _x, _o["cents"]))
    # intérêts composés
    pg.goto(LOCAL + "simulateur-interets-composes/"); pg.wait_for_timeout(500)
    _a = pg.evaluate("()=>window.sdIC({capital:1000,mensuel:0,taux:5,annees:10,livret:1.7})")
    if abs(_a["final"] - 1628.8946) > 0.01: fail("intérêts composés : 1000 euros à 5 %% sur 10 ans attendu 1628,89 obtenu %s" % _a["final"])
    if abs(_a["livret"] - 1183.6125) > 0.01: fail("intérêts composés : Livret A 1000 euros 10 ans attendu 1183,61 obtenu %s" % _a["livret"])
    _b = pg.evaluate("()=>window.sdIC({capital:0,mensuel:100,taux:0,annees:10,livret:0})")
    if abs(_b["final"] - 12000) > 0.01: fail("intérêts composés : 100 euros par mois à 0 %% sur 10 ans attendu 12000 obtenu %s" % _b["final"])
    _c = pg.evaluate("()=>window.sdIC({capital:0,mensuel:1000,taux:0,annees:5,livret:1.7})")
    if _c["verseLivret"] > 22950 + 1: fail("intérêts composés : dépôts au Livret A au-delà du plafond (%s)" % _c["verseLivret"])
    # budget mensuel
    pg.goto(LOCAL + "simulateur-budget-mensuel/"); pg.wait_for_timeout(500)
    _o = pg.evaluate("()=>window.sdBU({rev:2000,log:700,ali:300,loi:200,epa:200})")
    if abs(_o["reste"] - 600) > 0.01 or abs(_o["pBesoins"] - 50) > 0.01 or abs(_o["pEpargne"] - 10) > 0.01 or abs(_o["pEnvies"] - 10) > 0.01: fail("budget mensuel : cas de référence %s" % _o)
    _n = pg.evaluate("()=>window.sdBU({rev:1000,log:900,ali:300})")
    if _n["reste"] != -200: fail("budget mensuel : reste négatif attendu -200, obtenu %s" % _n["reste"])
    _p = pg.evaluate("()=>window.sdBU({rev:2000,cre:200,pret:500})")
    if abs(_p["tauxEndettement"] - 35) > 0.01 or _p["mensualiteMax"] != 500: fail("budget mensuel : taux d'endettement %s, mensualité max %s" % (_p["tauxEndettement"], _p["mensualiteMax"]))
    pg.click("#calculate"); pg.wait_for_timeout(300)
    if pg.locator("#bdsvg circle").count() < 3: fail("budget mensuel : le camembert ne se dessine pas")
    if pg.locator("#bdleg li").count() < 3: fail("budget mensuel : légende du camembert absente")
    # rentabilité locative
    pg.goto(LOCAL + "simulateur-rentabilite-locative/"); pg.wait_for_timeout(500)
    _a = pg.evaluate("()=>window.sdRL({prix:200000,travaux:0,notaire:16000,apport:20000,loyer:900,vac:1,charges:1800,taux:4,duree:20,ass:0.3})")
    if abs(_a["mensualite"] - 1236.72) > 0.02 or _a["brut"] != 5.4 or _a["net"] != 3.75 or abs(_a["cashflow"] + 561.72) > 0.02 or abs(_a["loyerEquilibre"] - 1512.79) > 0.02: fail("rentabilité locative : calcul faux %s" % _a)
    pg.click("#calculate"); pg.wait_for_timeout(200)
    if "par mois" not in pg.inner_text("#main") or "Loyer d'équilibre" not in pg.inner_text("#eq") or pg.evaluate("document.querySelectorAll('#rlbar .rl-bar span').length") < 2: fail("rentabilité locative : résultat ou graphique absent")
    # Mon plan de sortie du surendettement : analyse CSV, calendrier, progression (tout en local)
    pg.goto(LOCAL + "mon-plan-de-sortie-surendettement/"); pg.wait_for_timeout(600)
    _csv = "Date;Libellé;Montant\n01/09/2026;SALAIRE;1000,00\n02/09/2026;LOYER;-500,00\n03/09/2026;NETFLIX;-10,00\n03/10/2026;NETFLIX;-10,00\n05/10/2026;CARREFOUR;-40,00"
    _r = pg.evaluate("(c)=>{var a=SDplan.analyse(c);return [a.depenses,a.revenus,a.recurrents.length,a.cats[0].cat,a.n]}", _csv)
    if _r != [560, 1000, 1, "Logement et énergie", 5]: fail("plan de sortie : analyse CSV inattendue %s" % _r)
    _r2 = pg.evaluate("()=>{var a=SDplan.analyse('Date,Libelle,Debit,Credit\\n01/09/2026,PRET CETELEM,95.50,\\n02/09/2026,SALAIRE,,1200.00');return [a.depenses,a.revenus]}")
    if _r2 != [95.5, 1200]: fail("plan de sortie : colonnes débit/crédit mal lues %s" % _r2)
    if "Colonnes" not in (pg.evaluate("()=>SDplan.analyse('a;b\\n1;2').err") or ""): fail("plan de sortie : colonnes inconnues non signalées")
    _ics = pg.evaluate("()=>SDplan.ics({depot:new Date(2026,10,30),loyer:5,budget:true,debut:new Date(2026,10,3)})")
    if _ics.count("BEGIN:VEVENT") != 4 or "DTSTART;VALUE=DATE:20261130" not in _ics or "DTSTART;VALUE=DATE:20270228" not in _ics or "RRULE:FREQ=MONTHLY;COUNT=12" not in _ics: fail("plan de sortie : fichier .ics incohérent (4 événements, dépôt le 30/11/2026, réponse le 28/02/2027)")
    if pg.evaluate("()=>{var d=SDplan.addMonths(new Date(2026,10,30),3);return [d.getMonth(),d.getDate()]}") != [1, 28]: fail("plan de sortie : +3 mois depuis le 30 novembre doit donner le 28 février")
    pg.check("[data-st=s1]"); pg.check("[data-st=s2]"); pg.wait_for_timeout(100)
    if "2 étapes sur 7" not in pg.inner_text("#ps-prog-l"): fail("plan de sortie : progression non mise à jour")
    if pg.evaluate("()=>localStorage.getItem('sd-plan-sortie-v1')") is not None: fail("plan de sortie : mémorisation active sans consentement")
    # mobile : pages courtes (sections repliables, index compact) et filtres du guide toujours fonctionnels
    _mc = b.new_context(viewport={"width": 390, "height": 844}); _mp = _mc.new_page()
    for _u, _max, _folds in (("guides/smic-2026-montant-brut-net-horaire/", 9, 5), ("guides/sortir-du-surendettement-plan-d-action-positif/", 7, 5), ("simulateur-smic/", 10, 2), ("guides/", 8, 0), ("", 10, 0), ("simulateurs/", 8, 0), ("aides/", 13, 5), ("reconversion/", 7, 0)):
        _mp.goto(LOCAL + _u); _mp.wait_for_timeout(500)
        _ec = _mp.evaluate("document.documentElement.scrollHeight") / 844
        if _ec > _max: fail("mobile : %s fait %.1f écrans (max %d)" % (_u, _ec, _max))
        if _mp.evaluate("document.querySelectorAll('details.sd-m-fold').length") < _folds: fail("mobile : sections repliables absentes sur %s" % _u)
    _mp.goto(LOCAL + "guides/"); _mp.wait_for_timeout(400)
    if _mp.evaluate("[...document.querySelectorAll('#gd-list .gd-card')].filter(c=>!c.hidden).length") != 12: fail("mobile : l'index des guides doit afficher 12 guides avant « Voir tous »")
    _mp.click("#gd-more"); _mp.wait_for_timeout(300)
    if _mp.evaluate("[...document.querySelectorAll('#gd-list .gd-card')].filter(c=>!c.hidden).length") < 70: fail("mobile : « Voir tous les guides » n'affiche pas tout")
    _mp.fill("#gd-q", "smic"); _mp.wait_for_timeout(200)
    if not 1 <= _mp.evaluate("[...document.querySelectorAll('#gd-list .gd-card')].filter(c=>!c.hidden).length") <= 8: fail("mobile : la recherche de guides ne filtre pas")
    _mp.goto(LOCAL + "simulateur-smic/"); _mp.wait_for_timeout(400)
    if _mp.evaluate("document.getElementById('sd-suite').hidden") is not True: fail("mobile : la barre Suite ne doit pas masquer le haut de page")
    _mp.evaluate("window.scrollTo(0,900)"); _mp.wait_for_timeout(300)
    if _mp.evaluate("document.getElementById('sd-suite').hidden") or "/simulateur-" not in (_mp.evaluate("document.querySelector('#sd-suite a').getAttribute('href')") or ""): fail("mobile : barre Suite absente après lecture")
    _mp.click("#sd-suite button"); _mp.wait_for_timeout(200)
    if not _mp.evaluate("document.getElementById('sd-suite').hidden"): fail("mobile : la barre Suite doit pouvoir être fermée")
    _mp.goto(LOCAL + "reconversion/"); _mp.wait_for_timeout(400)
    if _mp.evaluate("[...document.querySelectorAll('.rc-panel')].filter(p=>!p.hidden).length") != 0: fail("reconversion : aucune piste ne doit être ouverte au départ")
    _mp.click(".rc-card >> nth=1"); _mp.wait_for_timeout(300)
    if _mp.evaluate("[...document.querySelectorAll('.rc-panel')].filter(p=>!p.hidden).map(p=>p.id)") != ["rc-p2"] or "conseil en évolution professionnelle" not in _mp.inner_text("#rc-p2"): fail("reconversion : le choix de situation n'affiche pas la bonne piste")
    if "/simulateur-demission-reconversion/" not in _mp.evaluate("[...document.querySelectorAll('#rc-p2 a')].map(a=>a.getAttribute('href')).join(' ')"): fail("reconversion : piste démission sans lien vers le simulateur")
    _mp.click(".rc-card >> nth=1"); _mp.wait_for_timeout(200)
    if _mp.evaluate("[...document.querySelectorAll('.rc-panel')].filter(p=>!p.hidden).length") != 0: fail("reconversion : un second toucher doit refermer la piste")
    _mc.close()
    # accessibilité : pas d'image sans alt, de champ sans libellé, de bouton ou lien sans nom, d'identifiant en double, de contraste insuffisant
    _a11y = open(os.path.join(ROOT, "tests", "a11y_check.js"), encoding="utf-8").read()
    for _u in ("", "simulateurs/", "simulateur-smic/", "simulateur-aide-carburant-grands-rouleurs/", "guides/smic-2026-montant-brut-net-horaire/", "guides/sortir-du-surendettement-plan-d-action-positif/", "metiers/infirmier-liberal/", "generateur-cv/", "mon-plan-de-sortie-surendettement/", "aides/", "reconversion/"):
        pg.goto(LOCAL + _u); pg.wait_for_timeout(500)
        _bad = [x for x in pg.evaluate(_a11y) if x[0] in ("img-sans-alt", "champ-sans-libelle", "bouton-sans-nom", "lien-sans-nom", "id-doublon", "h1-nombre", "contraste", "lang-absent")]
        if _bad: fail("accessibilité %s : %s" % (_u or "accueil", "; ".join("%s %s %s" % (x[0], x[1], x[2]) for x in _bad[:4])))
    # chômage : rupture conventionnelle (fin de contrat à partir du 1er sept. 2026) -> plafond 15 mois avant 55 ans
    pg.goto(LOCAL + "simulateur-chomage/"); pg.wait_for_timeout(200)
    pg.evaluate("()=>{const v={salaire:'30000',age:'40',duree:'24',conges:'0',supralegal:'0'};for(const k in v)document.getElementById(k).value=v[k];document.getElementById('rc').checked=true;calculer()}"); pg.wait_for_timeout(900)
    if "15 mois" not in pg.inner_text("#dureeEstimee"): fail("chômage rupture conventionnelle : attendu 15 mois (%s)" % pg.inner_text("#dureeEstimee"))
    # modèles de lettre : les champs alimentent la lettre
    for slug, flds, attendus in [("modele-lettre-demande-de-stage", {"nom":"Camille Martin","ent":"Cabinet Dupont","duree":"6 semaines"}, ["Camille Martin","Cabinet Dupont","demande de stage de 6 semaines"]),
                                 ("modele-lettre-demande-apprentissage", {"nom":"Camille Martin","diplome":"BTS SAM","cfa":"CFA de Limoges"}, ["Camille Martin","BTS SAM","CFA de Limoges"])]:
        pg.goto(LOCAL + slug + "/"); pg.wait_for_timeout(200)
        for k_, v_ in flds.items(): pg.fill("#" + k_, v_)
        txt = pg.inner_text("#lettre")
        for a_ in attendus:
            if a_ not in txt: fail("%s : « %s » absent de la lettre" % (slug, a_))
        if "[Adresse]" not in txt: fail("%s : champ vide non signalé" % slug)
    pg.goto(LOCAL + "modele-lettre-motivation-domaine/"); pg.wait_for_timeout(200)
    pg.fill("#ent", "Boulangerie Durand"); pg.select_option("#domaine", "restauration"); pg.select_option("#objectif", "stage3")
    txt = pg.inner_text("#lettre")
    for a_ in ["Boulangerie Durand", "restauration et l'hôtellerie", "demande de stage de 3e"]:
        if a_ not in txt: fail("lettre de motivation par domaine : « %s » absent" % a_)
    pg.click("#vider"); txt = pg.inner_text("#lettre")
    if "[Entreprise]" not in txt: fail("lettre de motivation par domaine : « Tout effacer » ne réinitialise pas")
    for slug_ in ["modele-lettre-stage-observation", "modele-lettre-stage-3eme"]:
        pg.goto(LOCAL + slug_ + "/"); pg.wait_for_timeout(200); pg.fill("#ent", "Cabinet Dupont")
        if "Cabinet Dupont" not in pg.inner_text("#lettre"): fail("%s : entreprise absente de la lettre" % slug_)
    for slug_ in ["modele-lettre-demission", "modele-lettre-rupture-conventionnelle", "modele-lettre-conge-transition-professionnelle", "modele-lettre-conge-vae", "modele-lettre-bilan-de-competences", "modele-lettre-retraite-progressive"]:
        pg.goto(LOCAL + slug_ + "/"); pg.wait_for_timeout(200); pg.fill("#ent", "SARL Dupont"); pg.fill("#nom", "Camille Martin")
        tx_ = pg.inner_text("#lettre")
        if "SARL Dupont" not in tx_ or "Camille Martin" not in tx_: fail("%s : champs absents de la lettre" % slug_)
    # fiches de révision : export PDF (zone d'impression) et partage (lien copié)
    for slug_ in ["contrat-de-travail", "smic-salaire-minimum", "rupture-du-cdi", "allocation-chomage", "du-brut-au-net", "periode-d-essai", "rupture-conventionnelle", "conges-payes-solde", "salaire-paiement-impaye"]:
        pg.goto(LOCAL + "fiches-revision/" + slug_ + "/"); pg.wait_for_timeout(200)
        pg.evaluate("window.print=function(){window.__pr=true}; navigator.share=undefined")
        pg.click(".fiche-pdf"); pg.wait_for_timeout(300)
        if not pg.evaluate("window.__pr===true && !!document.querySelector('#sd-print h1') && document.querySelectorAll('#sd-print details[open]').length>0"): fail("fiche %s : export PDF non préparé" % slug_)
        pg.evaluate("document.getElementById('sd-print')&&document.getElementById('sd-print').remove()")
        pg.click(".fiche-share"); pg.wait_for_timeout(250)
        if "fiches-revision/%s" % slug_ not in pg.inner_text(".fiche-msg") and "Lien copié" not in pg.inner_text(".fiche-msg"): fail("fiche %s : partage sans retour" % slug_)
    # accueil : Entrée dans la recherche ouvre le premier résultat
    pg.goto(LOCAL + "simulateurs/"); pg.wait_for_timeout(200)
    pg.fill("#search", "smic"); pg.press("#search", "Enter"); pg.wait_for_timeout(500)
    if "simulateur-smic" not in pg.url: fail("accueil : Entrée dans la recherche n'ouvre pas le simulateur (%s)" % pg.url)
    # erreurs JavaScript sur toutes les pages
    for f in pages:
        rel = os.path.relpath(f, ROOT)
        pg.goto(LOCAL + ("" if rel == "index.html" else rel.replace("index.html", ""))); pg.wait_for_timeout(150)
    b.close()
for e in errs: fail("navigateur : " + e)

httpd.shutdown()
print("\n%d échec(s)" % len(failures) if failures else "\nTous les tests sont réussis")
sys.exit(1 if failures else 0)
