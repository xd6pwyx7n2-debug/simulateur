/* SimuDroit : paramètres de calcul 2026 (source unique).
   À modifier ici lors de chaque revalorisation, puis lancer les tests (tests/run.py).
   Chaque bloc indique la date d'effet et la source officielle. */
window.SD_PARAMS = {
  verifie: "2026-10-17",
  smic: {                       // décret du SMIC, en vigueur depuis le 1er juin 2026
    depuis: "2026-06-01",
    horaire: 12.31,
    brutMensuel35h: 1867.02,
    netMensuel35h: 1477.93      // info.gouv.fr
  },
  pmss: 4005,                   // plafond mensuel de la Sécurité sociale 2026
  ijMaladie: {                  // ameli.fr, depuis le 1er juillet 2026
    depuis: "2026-07-01",
    plafondSalaire: 2613.83,    // 1,4 SMIC
    maxJour: 42.97,
    carenceJours: 3
  },
  ijMaternite: {                // ameli.fr
    taux: 0.79,
    maxJour: 104.02
  },
  accidentTravail: {            // ameli.fr ; bascule au 1er novembre 2026
    bascule: "2026-11-01",
    apres: { sj: 108.62, i1: 65.17, i2: 86.90 },
    avant: { sj: 400.82, i1: 240.49, i2: 320.66 }
  },
  are: {                        // règlement d'assurance chômage, France Travail, depuis le 1er janvier 2026
    depuis: "2026-01-01",
    plafondSalaireMensuel: 16020,
    plafondSjr: 526.86,
    partFixe: 13.18,
    taux1: 0.404,
    taux2: 0.57,
    minJour: 32.13,
    plafondTauxSjr: 0.75,
    degressif: { seuilSjr: 162.40, plancherJour: 92.57, coef: 0.70, ageMax: 55, apresJours: 182 },
    differeSupraDiviseur: 111.8,
    differeSupraMaxJours: 150
  }
};
