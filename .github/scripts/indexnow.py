#!/usr/bin/env python3
"""Prévient IndexNow (Bing, Yandex, etc.) des pages modifiées. Usage : indexnow.py <commit_avant> <commit_apres> [--dry-run]"""
import json, subprocess, sys, urllib.request, glob, os
HOST = "simudroit.fr"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
key_files = [os.path.basename(f)[:-4] for f in glob.glob(os.path.join(ROOT, "[0-9a-f]" * 32 + ".txt"))]
if not key_files: sys.exit("clé IndexNow introuvable")
KEY = key_files[0]
before, after = sys.argv[1], sys.argv[2]
dry = "--dry-run" in sys.argv
if set(before) == {"0"}: before = after + "~1"
files = subprocess.run(["git", "diff", "--name-only", "--diff-filter=AM", before, after], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split()
urls = []
for f in files:
    if f.endswith("index.html"):
        d = f[:-len("index.html")]
        if d.startswith(("tests/", "assets/", "simulateur/")): continue
        urls.append("https://%s/%s" % (HOST, d))
urls = sorted(set(urls))
print(len(urls), "URL(s) :", *urls, sep="\n")
if not urls: sys.exit(0)
body = json.dumps({"host": HOST, "key": KEY, "keyLocation": "https://%s/%s.txt" % (HOST, KEY), "urlList": urls[:10000]}).encode()
if dry: sys.exit(0)
req = urllib.request.Request("https://api.indexnow.org/indexnow", data=body, headers={"Content-Type": "application/json; charset=utf-8"})
try:
    with urllib.request.urlopen(req, timeout=30) as r: print("IndexNow :", r.status)
except Exception as e:
    print("IndexNow : échec non bloquant :", e)
