/* SimuDroit — paramètres de calcul 2026 (source unique).
 *
 * À modifier ICI uniquement lors de chaque revalorisation officielle,
 * puis lancer les tests : python tests/run.py
 *
 * Chaque bloc indique la date d'effet et la source officielle.
 * Après modification : mettre à jour aussi methode-et-sources/ si besoin
 * et le champ « verifie » ci-dessous.
 */
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
  ijIndependant: {              // ameli.fr (artisan/commerçant, micro-entrepreneur), au 1er janvier 2026
    depuis: "2026-01-01",
    pass: 48060,                // plafond du revenu pris en compte (1 PASS)
    maxJour: 65.84,             // 48 060 / 730
    seuilRaam: 4582,            // 10 % du PASS moyen : en dessous, indemnité nulle (arrêts débutant en 2026)
    carenceJours: 3,
    affiliationMois: 12,
    abattement: { vente: 0.71, prestations: 0.50, bnc: 0.34 }
  },
  microEntrepreneur: {         // economie.gouv.fr (pages du 06/03/2026 et du 01/04/2026), taux à compter du 1er janvier 2026
    depuis: "2026-01-01",
    taux: { vente: 0.123, prestations: 0.212, bnc: 0.256, cipav: 0.232 },   // cotisations sociales sur le chiffre d'affaires
    vl:   { vente: 0.01,  prestations: 0.017, bnc: 0.022, cipav: 0.022 }    // versement libératoire de l'impôt sur le revenu
  },
  congeIndependant: {          // ameli.fr, maternité et paternité des indépendants, au 1er janvier 2026
    depuis: "2026-01-01",
    ijForfaitJour: 65.84,       // 1/730 du PASS
    facteurBasRevenu: 0.10,     // IJ réduite à 10 % si revenu annuel moyen < seuil
    seuilRaam: 4582,
    affiliationMois: 6,
    allocationRepos: 4005,      // allocation forfaitaire de repos maternel
    allocationReposBas: 400.50,
    abattement: { vente: 0.71, prestations: 0.50, bnc: 0.34 }
  },
  congeSupplementaireNaissance: {  // ameli.fr, en vigueur au 1er juillet 2026 (salariés)
    depuis: "2026-07-01",
    mois1: { taux: 0.70, maxJour: 72.81 },
    mois2: { taux: 0.60, maxJour: 62.41 }
  },
  ati: {                        // Allocation des travailleurs indépendants — francetravail.fr et unedic.org (page Unédic du 13/10/2026)
    maxJour: 26.30, minJour: 19.73, jours: 182,
    revenuMinAnnuel: 10000, moisActiviteMin: 24, moisCessationMax: 12
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
