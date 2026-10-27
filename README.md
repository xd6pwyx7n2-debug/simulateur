# SimuDroit

Simulateurs gratuits de droits et de salaire (brut/net, chômage, indemnités, congés, micro-entrepreneur, etc.).

Site statique (HTML/CSS/JS sans framework), publié avec GitHub Pages : **https://simudroit.fr/**

Les résultats sont des **estimations indicatives**, sans valeur juridique. Voir [méthode et sources](https://simudroit.fr/methode-et-sources/).

---

## Architecture

```
├── index.html                 # Accueil + liste des simulateurs
├── assets/
│   ├── params.js              # ★ Source unique des barèmes 2026 (à mettre à jour ici)
│   ├── simulateur.js          # Scénarios rapides, impression, partage, abréviations
│   └── simulateur.css         # Styles communs des simulateurs
├── simulateur-*/index.html    # Un dossier par simulateur
├── methode-et-sources/        # Formules + sources officielles
├── guides/                    # Articles explicatifs
├── tests/
│   ├── run.py                 # Suite de non-régression (Playwright)
│   └── cas_reference.json     # Cas de calcul attendus
├── sitemap.xml
└── .github/workflows/tests.yml
```

- Tout le calcul se fait **dans le navigateur** (aucune donnée n’est envoyée).
- Les paramètres légaux et sociaux sont centralisés dans `assets/params.js`.

---

## Mettre à jour les barèmes (revalorisation)

1. Ouvrir **`assets/params.js`**.
2. Modifier uniquement les valeurs concernées (SMIC, PMSS, IJ, ARE, taux micro-entrepreneur, etc.).
3. Mettre à jour le champ `verifie` (date de vérification).
4. Mettre à jour la page `methode-et-sources/index.html` si les formules ou sources changent.
5. Lancer les tests (voir ci-dessous).
6. Commit + push → déploiement automatique via GitHub Pages.

Exemple de commentaire attendu dans `params.js` :
```js
smic: {                       // décret du SMIC, en vigueur depuis le 1er juin 2026
  depuis: "2026-06-01",
  horaire: 12.31,
  brutMensuel35h: 1867.02,
  netMensuel35h: 1477.93
},
```

---

## Lancer les tests

```bash
pip install playwright
playwright install --with-deps chromium
python tests/run.py
```

La suite vérifie :
- Cas de calcul de référence (`tests/cas_reference.json`)
- Liens internes et sitemap
- Unicité des titres et des `id`
- JSON-LD valide
- Accessibilité de base (labels, cibles tactiles, skip-link, `lang="fr"`)
- Absence d’erreurs JavaScript
- Comportement temps réel et cas particuliers (ATI, micro-entrepreneur, maintien de salaire…)

Les tests s’exécutent aussi automatiquement sur chaque push / pull request.

---

## Ajouter un nouveau simulateur (checklist)

1. Créer le dossier `simulateur-nom-du-sujet/` avec un `index.html`.
2. Réutiliser la structure d’un simulateur existant (brut-net ou indemnité-licenciement sont de bons modèles).
3. Charger `../assets/params.js`, `../assets/simulateur.css` et `../assets/simulateur.js`.
4. Utiliser les classes `.calculator`, `.field`, `.result`, `id="calculate"`, etc.
5. Ajouter des presets dans `assets/simulateur.js` (objet `PRESETS`).
6. Ajouter la page au **sitemap.xml**.
7. Ajouter un ou plusieurs cas dans `tests/cas_reference.json`.
8. Mettre à jour la liste sur la page d’accueil et, si besoin, les guides / glossaire.
9. Lancer `python tests/run.py`.

---

## Bonnes pratiques

- **Toujours** partir de `params.js` pour les montants légaux (ne pas hardcoder un SMIC ou un plafond dans une page).
- Garder les disclaimers visibles (« estimation indicative », lien vers les sources officielles).
- Préférer les `id` stables et uniques pour les champs de formulaire (utilisés par les presets et les tests).
- Respecter `prefers-reduced-motion` et les labels accessibles.
- Après toute modification de calcul, enrichir `cas_reference.json`.

---

## Licence & contribution

Projet personnel d’utilité publique. Les contributions (corrections de barèmes, nouveaux cas de test, améliorations d’accessibilité) sont les bienvenues via pull request.

En cas d’erreur de calcul ou de barème obsolète, ouvrir une issue ou une PR avec la source officielle.
