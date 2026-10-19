#!/usr/bin/env python3
"""Tests de non-régression SimuDroit.
Lancement : pip install playwright && playwright install chromium && python tests/run.py
Vérifie : cas de calcul de référence, liens internes, sitemap, balisage de base, erreurs JavaScript.
Les résultats attendus sont calculés à la main à partir des règles publiques (voir tests/cas_reference.md)."""
import glob, json, os, re, sys, threading, http.server, socketserver, functools
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE = "https://xd6pwyx7n2-debug.github.io/simulateur/"
PORT = 8791
failures = []

def fail(msg):
    failures.append(msg)
    print("ECHEC :", msg)

# ---------- Serveur local sous /simulateur/ ----------
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = unquote(urlparse(path).path)
        if p.startswith("/simulateur"):
            p = p[len("/simulateur"):] or "/"
        return os.path.join(ROOT, p.lstrip("/"))
    def log_message(self, *a): pass

socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", PORT), H)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
LOCAL = "http://127.0.0.1:%d/simulateur/" % PORT

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
    elif href.startswith("/simulateur/"): path = href[len("/simulateur/"):]
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
    # accueil : Entrée dans la recherche ouvre le premier résultat
    pg.goto(LOCAL); pg.wait_for_timeout(200)
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
