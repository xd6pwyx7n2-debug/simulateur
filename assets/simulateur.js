/* SimuDroit : scénarios rapides et récapitulatif imprimable (aucune donnée n'est envoyée ni conservée) */
(function () {
  "use strict";

  function today() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var j = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + j;
  }

  var slug = location.pathname.replace(/index\.html$/, "").replace(/\/+$/, "").split("/").pop();

  var PRESETS = {
    "simulateur-indemnites-journalieres-maladie": [
      ["2 000 € · 15 jours", { s1: 2000, s2: 2000, s3: 2000, jours: 15 }],
      ["SMIC · 30 jours", { s1: 1867.02, s2: 1867.02, s3: 1867.02, jours: 30 }],
      ["3 500 € · 60 jours", { s1: 3500, s2: 3500, s3: 3500, jours: 60 }]
    ],
    "simulateur-conge-maternite": [
      ["2 500 € · 1er enfant", { s1: 2500, s2: 2500, s3: 2500, charge: "0", naiss: "1" }],
      ["2 000 € · 3e enfant", { s1: 2000, s2: 2000, s3: 2000, charge: "2", naiss: "1" }],
      ["4 500 € · jumeaux", { s1: 4500, s2: 4500, s3: 4500, charge: "0", naiss: "2" }]
    ],
    "simulateur-conge-paternite": [
      ["2 500 € · 1 enfant", { s1: 2500, s2: 2500, s3: 2500, naiss: "1" }],
      ["3 800 € · 1 enfant", { s1: 3800, s2: 3800, s3: 3800, naiss: "1" }],
      ["2 500 € · jumeaux", { s1: 2500, s2: 2500, s3: 2500, naiss: "2" }]
    ],
    "simulateur-brut-net": [
      ["SMIC", { statut: "noncadre", brut: 1867.02 }],
      ["1 800 € brut", { statut: "noncadre", brut: 1800 }],
      ["2 500 € brut", { statut: "noncadre", brut: 2500 }],
      ["Cadre · 4 000 €", { statut: "cadre", brut: 4000 }]
    ],
    "simulateur-net-brut": [
      ["SMIC net", { statut: "noncadre", net: 1477.93 }],
      ["1 800 € net", { statut: "noncadre", net: 1800 }],
      ["2 000 € net", { statut: "noncadre", net: 2000 }],
      ["Cadre · 3 000 € net", { statut: "cadre", net: 3000 }]
    ],
    "simulateur-smic": [
      ["Temps plein · 35 h", { heures: 35, brut: "" }],
      ["80 % · 28 h", { heures: 28, brut: "" }],
      ["Mi-temps · 17,5 h", { heures: 17.5, brut: "" }],
      ["Comparer 1 900 €", { heures: 35, brut: 1900 }]
    ],
    "simulateur-salaire-horaire-mensuel": [
      ["SMIC · 12,31 €/h", { mode: "horaire", valeur: 12.31, heures: 35 }],
      ["15 €/h", { mode: "horaire", valeur: 15, heures: 35 }],
      ["2 500 € / mois", { mode: "mensuel", valeur: 2500, heures: 35 }],
      ["30 000 € / an", { mode: "annuel", valeur: 30000, heures: 35 }]
    ],
    "simulateur-indemnite-depart-retraite": [
      ["Volontaire · 22 ans", { type: "volontaire", annees: 22, mois: 0, remun12: 37200, remun3: 9300 }],
      ["Volontaire · 32 ans", { type: "volontaire", annees: 32, mois: 0, remun12: 42000, remun3: 10500 }],
      ["Mise à la retraite · 15 ans", { type: "mise", annees: 15, mois: 0, remun12: 36000, remun3: 9000 }]
    ],
    "simulateur-indemnite-licenciement": [
      ["5 ans · 2 500 €/mois", { remuneration12: 30000, remuneration3: 7500, annees: 5, mois: 0 }],
      ["10 ans · 2 500 €/mois", { remuneration12: 30000, remuneration3: 7500, annees: 10, mois: 0 }],
      ["15 ans · 3 000 €/mois", { remuneration12: 36000, remuneration3: 9000, annees: 15, mois: 0 }]
    ],
    "simulateur-rupture-conventionnelle": [
      ["3 ans · 2 000 €", { salaire: 2000, annees: 3, mois: 0 }],
      ["8 ans · 2 500 €", { salaire: 2500, annees: 8, mois: 0 }],
      ["15 ans · 3 200 €", { salaire: 3200, annees: 15, mois: 0 }]
    ],
    "simulateur-chomage": [
      ["2 000 € · 35 ans · 2 ans", { salaire: 2000, age: 35, duree: "24" }],
      ["1 800 € · 28 ans · 1 an", { salaire: 1800, age: 28, duree: "12" }],
      ["3 000 € · 52 ans · 3 ans", { salaire: 3000, age: 52, duree: "36" }]
    ],
    "simulateur-prime-precarite": [
      ["CDD 6 mois · 1 500 €/mois", { remuneration: 9000, taux: "10" }],
      ["CDD 12 mois · 1 900 €/mois", { remuneration: 22800, taux: "10" }],
      ["Taux réduit 6 %", { remuneration: 9000, taux: "6" }]
    ],
    "simulateur-conges-payes": [
      ["25 jours · 2 500 €/mois", { reference: 30000, jours: 25, mensuel: 2500 }],
      ["10 jours · 2 000 €/mois", { reference: 24000, jours: 10, mensuel: 2000 }]
    ],
    "simulateur-heures-supplementaires": [
      ["15 €/h · 8 h + 4 h", { tauxHoraire: 15, heures25: 8, heures50: 4 }],
      ["20 €/h · 8 h", { tauxHoraire: 20, heures25: 8, heures50: 0 }],
      ["SMIC · 8 h", { tauxHoraire: 12.31, heures25: 8, heures50: 0 }]
    ],
    "simulateur-temps-partiel": [
      ["80 % · 28 h", { salaireTempsComplet: 2500, heuresComplet: 35, heuresContrat: 28, heuresComplementaires: 0 }],
      ["60 % · 21 h", { salaireTempsComplet: 2500, heuresComplet: 35, heuresContrat: 21, heuresComplementaires: 0 }],
      ["50 % · 17,5 h", { salaireTempsComplet: 2500, heuresComplet: 35, heuresContrat: 17.5, heuresComplementaires: 0 }]
    ],
    "simulateur-preavis-demission": [
      ["15 jours", { dateDemission: today(), dureeType: "jours", duree: 15 }],
      ["1 mois", { dateDemission: today(), dureeType: "mois", duree: 1 }],
      ["3 mois", { dateDemission: today(), dureeType: "mois", duree: 3 }]
    ],
    "simulateur-solde-tout-compte": [
      ["Démission", { salaire: 2500, jours: 10, conges: 1800, licenciement: 0, preavis: 0, precarite: 0, autres: 0 }],
      ["Fin de CDD", { salaire: 2000, jours: 8, conges: 600, licenciement: 0, preavis: 0, precarite: 1500, autres: 0 }],
      ["Licenciement", { salaire: 2800, jours: 12, conges: 2100, licenciement: 6000, preavis: 2800, precarite: 0, autres: 0 }]
    ]
  };

  var calc = document.querySelector(".calculator");
  if (!calc) return;

  function fire(el, type) {
    el.dispatchEvent(new Event(type, { bubbles: true }));
  }

  function submitButton() {
    return document.getElementById("calculate") ||
      calc.querySelector("button:not(.sd-chip):not(.sd-secondary)");
  }

  /* ---------- Scénarios rapides ---------- */
  var presets = PRESETS[slug];
  if (presets && presets.length) {
    var box = document.createElement("div");
    box.className = "sd-presets";
    box.innerHTML = '<span class="sd-presets-title">Essayer un exemple</span><div class="sd-chips" role="group" aria-label="Exemples de calcul"></div>';
    var chips = box.querySelector(".sd-chips");

    presets.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sd-chip";
      b.textContent = p[0];
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        var values = p[1];
        Object.keys(values).forEach(function (id) {
          var el = document.getElementById(id);
          if (!el) return;
          el.value = values[id];
          fire(el, "input");
          fire(el, "change");
        });
        Array.prototype.forEach.call(chips.children, function (c) { c.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        var go = submitButton();
        if (go) go.click();
        var result = calc.querySelector(".result");
        if (result && result.scrollIntoView) {
          setTimeout(function () { result.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 120);
        }
      });
      chips.appendChild(b);
    });

    var anchor = calc.querySelector(".field");
    if (anchor) anchor.parentNode.insertBefore(box, anchor);
    else calc.insertBefore(box, calc.firstChild.nextSibling);

    calc.addEventListener("input", function (e) {
      if (e.target && e.target.closest && e.target.closest(".sd-chips")) return;
      Array.prototype.forEach.call(chips.children, function (c) { c.setAttribute("aria-pressed", "false"); });
    });
  }

  /* ---------- Récapitulatif imprimable ---------- */
  function labelFor(el) {
    var l = document.querySelector('label[for="' + el.id + '"]');
    return l ? l.textContent.replace(/\s+/g, " ").trim() : el.id;
  }

  function displayValue(el) {
    if (el.tagName === "SELECT") {
      var o = el.options[el.selectedIndex];
      return o ? o.textContent.replace(/\s+/g, " ").trim() : "";
    }
    if (el.type === "date" && el.value) {
      var p = el.value.split("-");
      return p[2] + "/" + p[1] + "/" + p[0];
    }
    return el.value;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function buildPrint() {
    var old = document.getElementById("sd-print");
    if (old) old.remove();
    var h1 = document.querySelector("h1");
    var now = new Date();
    var when = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) +
      " à " + now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    var rows = "";
    Array.prototype.forEach.call(calc.querySelectorAll("input[id], select[id]"), function (el) {
      var wrap = el.closest(".field");
      if (wrap && wrap.offsetParent === null) return;
      var v = displayValue(el);
      if (v === "" || v === null) return;
      rows += "<tr><td>" + esc(labelFor(el)) + "</td><td><strong>" + esc(v) + "</strong></td></tr>";
    });

    var res = calc.querySelector(".result").cloneNode(true);
    Array.prototype.forEach.call(res.querySelectorAll(".sd-actions,.official-link,.details-toggle,script,button"), function (n) { n.remove(); });

    var div = document.createElement("div");
    div.id = "sd-print";
    var titre = h1 ? h1.textContent.replace(/\s+/g, " ").trim() : "SimuDroit";
    div.innerHTML =
      '<div class="pr-band"><div class="pr-logo">Simu<span>Droit</span></div><div class="pr-tag">Récapitulatif de simulation</div></div>' +
      '<h1>' + esc(titre) + '</h1>' +
      '<div class="meta"><span class="pr-chip">' + esc(when) + '</span> Simulation réalisée sur SimuDroit</div>' +
      '<h2>Données saisies</h2><table>' + rows + '</table>' +
      '<h2>Résultat de l\'estimation</h2><div class="print-result">' + res.innerHTML + '</div>' +
      '<div class="disclaimer"><strong>Important.</strong> Ce récapitulatif est une estimation indicative calculée à partir des règles générales du droit du travail (paramètres vérifiés en octobre 2026) et des seules données saisies. ' +
      "Il n'a pas de valeur juridique : ce n'est ni une attestation, ni un calcul officiel, ni un avis juridique. Votre convention collective, votre contrat, vos bulletins de paie et les textes applicables prévalent. " +
      "En cas de désaccord, rapprochez-vous de votre employeur, de l'inspection du travail, d'un syndicat ou d'un avocat.</div>" +
      '<div class="foot"><span>Formules et sources : https://xd6pwyx7n2-debug.github.io/simulateur/methode-et-sources/</span><span>Simulation : ' + esc(location.href.split("#")[0]) + '</span></div>';
    document.body.appendChild(div);
  }

  var result = calc.querySelector(".result");
  if (result) {
    var actions = document.createElement("div");
    actions.className = "sd-actions";
    var pb = document.createElement("button");
    pb.type = "button";
    pb.className = "sd-secondary";
    pb.innerHTML = "🖨️ Imprimer ou enregistrer le récapitulatif (PDF)";
    pb.addEventListener("click", function () {
      buildPrint();
      window.print();
    });
    actions.appendChild(pb);

    function resultText() {
      var rows = [];
      Array.prototype.forEach.call(calc.querySelectorAll("input[id], select[id]"), function (el) {
        var wrap = el.closest(".field");
        if (wrap && wrap.offsetParent === null) return;
        var v = displayValue(el);
        if (v === "" || v === null) return;
        rows.push(labelFor(el) + " : " + v);
      });
      var r = result.cloneNode(true);
      Array.prototype.forEach.call(r.querySelectorAll(".sd-actions,.official-link,.details-toggle,script,button"), function (n) { n.remove(); });
      var out = (r.textContent || "").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").replace(/\n{2,}/g, "\n").trim();
      var h = document.querySelector("h1");
      return (h ? h.textContent.trim() : "Simulation") + " (SimuDroit)\n\n" + rows.join("\n") + "\n\nRésultat :\n" + out +
        "\n\nEstimation indicative, sans valeur juridique.\n" + location.href.split("#")[0];
    }

    var cb = document.createElement("button");
    cb.type = "button";
    cb.className = "sd-secondary";
    cb.textContent = "📋 Copier le résultat";
    cb.addEventListener("click", function () {
      var txt = resultText();
      function done(ok) {
        var old = "📋 Copier le résultat";
        cb.textContent = ok ? "✅ Résultat copié" : "Copie impossible";
        setTimeout(function () { cb.textContent = old; }, 2200);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { done(true); }, function () { done(false); });
      } else {
        try {
          var ta = document.createElement("textarea");
          ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
          document.body.appendChild(ta); ta.select();
          var ok = document.execCommand("copy"); ta.remove(); done(ok);
        } catch (e) { done(false); }
      }
    });
    actions.appendChild(cb);

    if (navigator.share) {
      var sb = document.createElement("button");
      sb.type = "button";
      sb.className = "sd-secondary";
      sb.textContent = "📤 Partager";
      sb.addEventListener("click", function () {
        navigator.share({ title: document.title, text: resultText(), url: location.href.split("#")[0] }).catch(function () {});
      });
      actions.appendChild(sb);
    }

    var rb = document.createElement("button");
    rb.type = "button";
    rb.className = "sd-secondary";
    rb.textContent = "↺ Nouvelle simulation";
    rb.addEventListener("click", function () {
      Array.prototype.forEach.call(calc.querySelectorAll("input[id], select[id]"), function (el) {
        if (el.tagName === "SELECT") {
          var sel = 0;
          Array.prototype.forEach.call(el.options, function (o, i) { if (o.defaultSelected) sel = i; });
          el.selectedIndex = sel;
        } else {
          el.value = el.defaultValue;
        }
        fire(el, "input"); fire(el, "change");
      });
      result.classList.remove("visible", "show");
      Array.prototype.forEach.call(document.querySelectorAll(".sd-chips button"), function (c) { c.setAttribute("aria-pressed", "false"); });
      calc.scrollIntoView({ behavior: "smooth", block: "start" });
      var first = calc.querySelector("input[id], select[id]");
      if (first && first.focus) setTimeout(function () { first.focus({ preventScroll: true }); }, 350);
    });
    actions.appendChild(rb);

    result.appendChild(actions);
  }

  /* Confort : touche Entrée, clavier numérique, défilement vers le résultat */
  Array.prototype.forEach.call(calc.querySelectorAll('input[type="number"]'), function (el) {
    if (!el.getAttribute("inputmode")) el.setAttribute("inputmode", "decimal");
    el.setAttribute("enterkeyhint", "done");
  });
  calc.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || !e.target || e.target.tagName !== "INPUT") return;
    var go = submitButton();
    if (go) { e.preventDefault(); go.click(); }
  });
  (function () {
    var go = submitButton();
    if (!go || !result) return;
    go.addEventListener("click", function () {
      setTimeout(function () {
        if (result.offsetParent !== null && result.scrollIntoView) {
          var r = result.getBoundingClientRect();
          if (r.top > window.innerHeight * 0.7 || r.top < 0) result.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 150);
    });
  })();

  window.addEventListener("afterprint", function () {
    var p = document.getElementById("sd-print");
    if (p) p.remove();
  });
})();
