#!/usr/bin/env python3
"""Vérifie que les sources officielles citées répondent encore (avertissement, jamais bloquant : certains sites refusent les robots)."""
import re, glob, urllib.request, urllib.error, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
urls = set()
for f in glob.glob(os.path.join(ROOT, "**", "index.html"), recursive=True):
    for u in re.findall(r'href="(https?://[^"]+)"', open(f, encoding="utf-8").read()):
        if "simudroit.fr" in u or any(x in u for x in ("plausible.io", "schema.org", "fonts.g", "w3.org", "github.com", "github.io")): continue
        urls.add(u.split("#")[0])
bad = []
for u in sorted(urls):
    try:
        req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 (verification SimuDroit)"})
        with urllib.request.urlopen(req, timeout=20) as r: pass
    except urllib.error.HTTPError as e:
        if e.code in (404, 410): bad.append((e.code, u))
    except Exception as e:
        pass
print(len(urls), "liens externes vérifiés")
for c, u in bad: print("::warning::lien mort", c, u)
sys.exit(0)
