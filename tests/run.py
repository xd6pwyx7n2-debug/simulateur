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
           "cpf", "impot-revenu", "salaire-net-apres-impot", "frais-kilometriques", "comparer-mon-salaire", "rupture-assistante-maternelle"):
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
        pg.evaluate("(a)=>{document.getElementById('mode').value=a[0];document.getElementById('act').value=a[1];document.getElementById('montant').value=a[2];document.getElementById('acre').checked=a[3];document.getElementById('vl').checked=a[4];document.getElementById('calculate').click()}", [mode, act, str(montant), acre, vl]); pg.wait_for_timeout(900)
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
    for slug_ in ["contrat-de-travail", "smic-salaire-minimum", "rupture-du-cdi", "allocation-chomage", "du-brut-au-net"]:
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
