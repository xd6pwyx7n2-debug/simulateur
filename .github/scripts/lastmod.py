#!/usr/bin/env python3
"""Met à jour les <lastmod> des sitemaps avec la vraie date du dernier commit de chaque page (jamais de date inventée)."""
import re, subprocess, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
def last(path):
    r = subprocess.run(["git", "log", "-1", "--format=%cs", "--", path], cwd=ROOT, capture_output=True, text=True)
    return r.stdout.strip()
for sm in ("sitemap.xml", "sitemap-simudroit.xml"):
    p = os.path.join(ROOT, sm); s = open(p, encoding="utf-8").read(); n = 0
    def rep(m):
        global n
        loc = m.group(1); path = loc.replace("https://simudroit.fr/", "") or ""
        f = (path + "index.html") if (path == "" or path.endswith("/")) else path
        d = last(f)
        if not d: return m.group(0)
        n += 1
        return f"<loc>{loc}</loc>\n    <lastmod>{d}</lastmod>"
    s2 = re.sub(r"<loc>([^<]+)</loc>\s*<lastmod>[^<]*</lastmod>", rep, s)
    if s2 != s: open(p, "w", encoding="utf-8").write(s2)
    print(sm, n, "dates mises à jour")
