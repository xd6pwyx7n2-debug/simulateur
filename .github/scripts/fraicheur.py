#!/usr/bin/env python3
"""Contrôle hebdomadaire de fraîcheur des paramètres de calcul.
Échoue si la date « verifie » de assets/params.js a plus de MAX_JOURS jours (rappel de revérification),
et signale les revalorisations officielles habituelles à surveiller."""
import re, sys, datetime as dt, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MAX_JOURS = 75
src = open(os.path.join(ROOT, "assets", "params.js"), encoding="utf-8").read()
v = re.search(r'verifie:\s*"(\d{4}-\d{2}-\d{2})"', src)
if not v: sys.exit("champ « verifie » introuvable dans assets/params.js")
d = dt.date.fromisoformat(v.group(1))
age = (dt.date.today() - d).days
print(f"Paramètres vérifiés le {d} ({age} jours).")
print("À surveiller : SMIC et plafond de la Sécurité sociale (1er janvier), indemnités journalières et chômage (juillet), barèmes CPF, jours fériés de l'année suivante.")
if age > MAX_JOURS:
    sys.exit(f"Les paramètres n'ont pas été revérifiés depuis {age} jours (limite {MAX_JOURS}) : relire assets/params.js, puis mettre à jour « verifie » et methode-et-sources/.")
