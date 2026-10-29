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
    p = P(); p.feed(s)
    if p.h1 != 1 and rel != "404.html": fail("%s : %d balises h1" % (rel, p.h1))
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
    if rel in ("404.html",): continue
    url = BASE + (rel[:-len("index.html")] if rel.endswith("index.html") else rel)
    if url not in locs: fail("sitemap : page absente %s" % url)
print("Contrôles statiques :", len(pages), "pages,", len(locs), "URL de sitemap")

# ---------- 1bis. Date « Barèmes vérifiés le … » sur chaque simulateur ----------
import datetime
MOIS = {"janvier":1,"février":2,"mars":3,"avril":4,"mai":5,"juin":6,"juillet":7,"août":8,"septembre":9,"octobre":10,"novembre":11,"décembre":12}
_ver = re.search(r'verifie:\s*"(\d{4})-(\d{2})-(\d{2})"', open(os.path.join(ROOT, "assets", "params.js"), encoding="utf-8").read())
_ref = datetime.date(*map(int, _ver.groups()))
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
    # saisie vide : un message en ligne, jamais une boîte alert()
    for f in sorted(glob.glob(os.path.join(ROOT, "simulateur-*/index.html"))):
        slug = os.path.basename(os.path.dirname(f))
        pg.goto(LOCAL + slug + "/"); pg.wait_for_timeout(200)
        pg.evaluate("(document.getElementById('calculate')||document.querySelector('.calculator button:not(.sd-chip):not(.sd-secondary)')).click()"); pg.wait_for_timeout(250)
    # accessibilité : champs nommés, cibles tactiles du menu, champs numériques
    pg.set_viewport_size({"width": 390, "height": 844})
    for f in pages:
        rel = os.path.relpath(f, ROOT)
        if rel == "404.html": continue
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
    pg.goto(LOCAL + "simulateur-brut-net/"); pg.wait_for_timeout(200)
    pg.evaluate("()=>{var e=document.getElementById('brut');e.value='2500';e.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('calculate').click()}"); pg.wait_for_timeout(1100)
    pg.evaluate("()=>{var e=document.getElementById('brut');e.value='3000';e.dispatchEvent(new Event('input',{bubbles:true}))}"); pg.wait_for_timeout(1600)
    if norm("2 340,00 €") not in norm(pg.inner_text("#net")): fail("temps réel : le résultat ne s'est pas mis à jour (%s)" % pg.inner_text("#net"))
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
        pg.evaluate("(a)=>{document.getElementById('statut').value=a[0];document.getElementById('cat').value=a[1];document.getElementById('sam').value=a[2];document.getElementById('calculate').click()}", [st, cat, str(sam)]); pg.wait_for_timeout(900)
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
    # chômage : rupture conventionnelle (fin de contrat à partir du 1er sept. 2026) -> plafond 15 mois avant 55 ans
    pg.goto(LOCAL + "simulateur-chomage/"); pg.wait_for_timeout(200)
    pg.evaluate("()=>{const v={salaire:'30000',age:'40',duree:'24',conges:'0',supralegal:'0'};for(const k in v)document.getElementById(k).value=v[k];document.getElementById('rc').checked=true;calculer()}"); pg.wait_for_timeout(900)
    if "15 mois" not in pg.inner_text("#dureeEstimee"): fail("chômage rupture conventionnelle : attendu 15 mois (%s)" % pg.inner_text("#dureeEstimee"))
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
