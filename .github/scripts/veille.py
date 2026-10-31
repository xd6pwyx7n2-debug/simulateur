#!/usr/bin/env python3
"""Veille des sources : liste les pages dont une date de vérification citée
(« vérifié le 12 août 2026 », « vérifiée le ... ») date de plus de SEUIL jours.
Avertissement seulement : sort en code 0, mais écrit un résumé dans le journal
et dans $GITHUB_STEP_SUMMARY quand il existe."""
import glob, os, re, sys, datetime as dt
SEUIL = int(sys.argv[1]) if len(sys.argv) > 1 else 180
M = {m: i + 1 for i, m in enumerate("janvier février mars avril mai juin juillet août septembre octobre novembre décembre".split())}
R = re.compile(r"v[ée]rifi[ée]e?s? le (\d{1,2})(?:er)? ([a-zéû]+) (20\d\d)")
today = dt.date.today()
rows = []
for f in sorted(glob.glob("**/index.html", recursive=True)):
    if f.startswith(("tests/", "assets/")): continue
    s = open(f, encoding="utf-8").read()
    old = []
    for d, m, y in R.findall(s):
        if m not in M: continue
        try: dd = dt.date(int(y), M[m], int(d))
        except ValueError: continue
        age = (today - dd).days
        if age > SEUIL: old.append((age, dd.isoformat()))
    if old:
        a = max(old)
        rows.append((a[0], f[:-len("index.html")] or "/", a[1], len(old)))
rows.sort(reverse=True)
out = ["Pages citant une vérification de plus de %d jours : %d" % (SEUIL, len(rows))] + ["- /%s (plus ancienne : %s, %d jours)" % (p.strip('/'), d, a) for a, p, d, n in rows]
txt = "\n".join(out)
print(txt)
sm = os.environ.get("GITHUB_STEP_SUMMARY")
if sm:
    with open(sm, "a", encoding="utf-8") as fh: fh.write("## Veille des sources\n" + txt + "\n")
